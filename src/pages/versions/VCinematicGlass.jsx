import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, MotionConfig } from 'framer-motion';
import LazyGumlet from '../../components/home/LazyGumlet';
import BrandMark from '../../components/home/BrandMark';

// Frozen R15 snapshot, mounted at /versions/cinematic-glass. Mission: aheadofmarket.com:home
// (R17 froze it when /r5 moved on to the Glitch&Grit-structure reel). Do not develop here.
// "Cinematic glass" — Patrik's R15 rethink: the editorial system fell flat, so the page is now
// raw full-bleed footage + liquid glass + bottom-anchored sentence-case type (VEX-reference
// structure), rendered unmistakably AOM: champagne-gold only accent, gold square period on every
// headline, giant outlined wordmark/monogram backdrops, every frame our real client footage.
// Copy is Patrik's narrative, verbatim — the copy IS the story.

const TICKER = ["Skylar", "PA'LA", 'Ambition Mechanical', 'ISA Energy', 'Brandon Wiley', 'Space Rising', 'Included Health', 'Intelliplay', 'Valor to Victory', 'Kohrs'];

const STORIES = [
  {
    client: 'ISA Energy', tag: 'Energy · Film', media: 'slate',
 big: '3', bigLabel: 'films, demo, validation, brand',
    slate: { title: 'ISA ENERGY', roll: 'A three-film series', scene: '3 acts · 9 beats · 4 subjects', take: 'Live in investor meetings' },
    headline: 'A three-video series, now in every investor meeting',
 body: `We launched a three-video series with the ISA team, a product demo, a validation study where it's stress-tested under scientific conditions, and a brand film about their mission. All three are live on their site and running in investor meetings.`,
    stat: 'Helped raise a substantial round.',
  },
  {
    client: 'Space Rising', tag: 'Tech · Platform', media: 'site', src: '/hero-sites/space-rising.jpg',
    big: '1,000+', bigLabel: 'in one room at Space Congress',
 headline: 'SpaceOS, and 1,000 people in one room',
    body: `We built SpaceOS, their platform for the space industry to gather online with shared resources and insider information. Then we ran heavy sprints to get them ready for big moments like Space Congress.`,
    stat: 'Drove a wave of traffic to the new platform.',
  },
  {
    client: 'Included Health', tag: 'Healthcare · Film', media: 'slate',
    big: 'Top-5', bigLabel: 'US insurer by size',
    slate: { title: 'INCLUDED HEALTH', roll: 'A film series', scene: 'Healthcare · Nationwide', take: 'Screened at Inspire Summit' },
    headline: 'Films for one of the largest insurers in the US',
 body: `We finished a series of videos for Included Health, one of the largest insurance providers in the country, and were proud to work alongside them at their Inspire Summit.`,
    stat: 'Produced for the Inspire Summit.',
  },
  {
    client: 'Ambition Mechanical', tag: 'Trades · Web + Ads', media: 'site', src: '/hero-sites/ambition.jpg',
    big: '4 / mo', bigLabel: 'organic leads from the new site alone',
    headline: 'Four solid leads a month, organically',
 body: `We've been running Ambition Mechanical's Google Ads, but the new website we built is already pulling in four solid leads a month on its own, organically, before the ad spend even counts.`,
    stat: 'Before paid spend even counts.',
  },
];

const PORTFOLIO = [
  { t: 'Lagos White Party', id: '698a596eaec3d4e420c22a9a', tag: 'Event', v: true },
  { t: 'Lagos Recap', id: '698a5946873071aec5c96163', tag: 'Event', v: true },
  { t: 'Nook 10 Year', id: '698a5a8b873071aec5c99c6f', tag: 'Brand', v: true },
  { t: "PA'LA x HARUMI", id: '698a5391fc23d3d76fa7306c', tag: 'Brand', v: true },
  { t: 'Journey to Gary Vee', id: '698a6296fc23d3d76fa8d992', tag: 'Doc' },
  { t: 'Noble Real Estate', id: '698a5b86fc23d3d76fa82ece', tag: 'Brand' },
  { t: 'Virtu Hospitality', id: '698a5ef5fc23d3d76fa87ef4', tag: 'Brand' },
  { t: 'United Food Bank', id: '698a5fcdfc23d3d76fa893b8', tag: 'Nonprofit' },
  { t: 'Abstrakt', id: '698a5faffc23d3d76fa8909f', tag: 'Brand' },
  { t: 'Intelliplay', id: '698a5386aec3d4e420c17a69', tag: 'Tech' },
  { t: 'Memorial Towers', id: '698a584faec3d4e420c20fef', tag: 'Real Estate' },
  { t: 'Refined Gardens', id: '698a57fb873071aec5c94350', tag: 'Brand' },
];

const VOICES = [
  { q: 'The video was a huge tool in recruiting our first 3 cohorts. Every sponsor meeting we played it. It did the selling for us.', n: 'Brandon Clarke', c: 'Startup AZ Foundation', m: '3 cohorts recruited' },
 { q: 'Before AOM we posted randomly. Now we have a repeatable system, the content actually brings people in.', n: 'Sumit Seth', c: 'Naamly SaaS', m: 'Repeatable content engine' },
  { q: 'They did not just shoot beautiful footage. They understood who we are and made sure every frame said it.', n: 'Gio Osso', c: 'Virtu Hospitality Group', m: 'Brand story on screen' },
];

const CHAPTERS = ['The hook', 'Who we are', 'What we do', 'The billboard', 'The team', 'The work', 'Voices', 'The conversation'];

const HERO_REEL = '698a6296fc23d3d76fa8d992'; // Journey to Gary Vee, strongest horizontal doc footage
const FILM_REEL = '698a5ef5fc23d3d76fa87ef4'; // Virtu Hospitality, the "video company" chapter plays under itself
const BILL_REEL = '698a5fcdfc23d3d76fa893b8'; // United Food Bank, under the billboard line

const embed = id => `https://play.gumlet.io/embed/${id}?autoplay=true&preload=false&loop=false&background=false&disable_player_controls=false`;
const poster = (id, w = 800) => `https://video.gumlet.io/697678222b8b17fbb707acef/${id}/thumbnail-1-0.png?format=auto&w=${w}`;

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
.r15 {
  --ink:#060606; --ink-2:#0D0D0C; --paper:#F6F6F4;
  --mut:rgba(246,246,244,.64); --dim:rgba(246,246,244,.42);
  --line:rgba(255,255,255,.14); --gold:#C4A46A; --gold-deep:#A8884C;
  --fx:'Inter',system-ui,Helvetica,Arial,sans-serif;
  --pad:clamp(1.5rem,4.5vw,4rem);
  font-family:var(--fx); color:var(--paper); background:var(--ink);
  font-size:16px; line-height:1.6;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
}
.r15 *, .r15 *::before, .r15 *::after { box-sizing:border-box; margin:0; padding:0; }
.r15 a { color:inherit; text-decoration:none; }
.r15 button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.r15 img { display:block; max-width:100%; }
.r15 a:focus-visible, .r15 button:focus-visible, .r15 input:focus-visible, .r15 textarea:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }
.r15 .gold { color:var(--gold); }
.r15 .dim { color:var(--dim); }

/* the signature: square gold period */
.r15 .sq { display:inline-block; width:.12em; height:.12em; background:var(--gold); margin-left:.08em; }

/* display type — sentence case, light, tight */
.r15 .dp { font-weight:400; letter-spacing:-.04em; line-height:1.04; }

/* small label */
.r15 .lb { font-size:.68rem; font-weight:500; letter-spacing:.18em; text-transform:uppercase; color:var(--dim); }

/* liquid glass (per reference spec) */
.r15 .lg {
  background:rgba(0,0,0,.4); background-blend-mode:luminosity;
  backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
  border:none; box-shadow:inset 0 1px 1px rgba(255,255,255,.1);
  position:relative; overflow:hidden;
}
.r15 .lg::before {
  content:''; position:absolute; inset:0; border-radius:inherit; padding:1.4px;
  background:linear-gradient(180deg, rgba(255,255,255,.3) 0%, rgba(255,255,255,.1) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,.1) 80%, rgba(255,255,255,.3) 100%);
  -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none;
}

/* buttons */
.r15 .btn-gold {
  display:inline-block; background:var(--gold); color:var(--ink); white-space:nowrap;
  font-size:.88rem; font-weight:500; padding:.85rem 1.9rem; border-radius:10px;
  transition:background .18s;
}
.r15 .btn-gold:hover { background:var(--gold-deep); }
.r15 .btn-glass {
  display:inline-block; color:var(--paper); white-space:nowrap;
  font-size:.88rem; font-weight:500; padding:.85rem 1.9rem; border-radius:10px;
  transition:background .18s, color .18s;
}
.r15 .btn-glass:hover { background:var(--paper); color:var(--ink); }

/* glass chip */
.r15 .chip {
  display:inline-flex; align-items:center; gap:.6rem; border-radius:10px;
  padding:.55rem 1rem; font-size:.68rem; font-weight:500; letter-spacing:.18em;
  text-transform:uppercase; color:var(--paper);
}
.r15 .chip .csq { width:5px; height:5px; background:var(--gold); flex:none; }

/* ─── NAV — floating glass bar ─── */
.r15 .navw { position:fixed; top:0; left:0; right:0; z-index:200; padding:1.25rem var(--pad) 0; }
.r15 .nav {
  border-radius:14px; padding:.6rem .75rem .6rem 1.1rem;
  display:flex; align-items:center; justify-content:space-between; gap:1rem;
}
.r15 .nav-brand { display:flex; align-items:center; gap:.65rem; position:relative; z-index:1; }
.r15 .nav-mark { width:24px; height:24px; color:var(--paper); }
.r15 .nav-name { font-size:.9rem; font-weight:500; letter-spacing:-.02em; }
.r15 .nav-links { display:flex; gap:2rem; position:relative; z-index:1; }
.r15 .nav-links a { font-size:.82rem; font-weight:400; color:var(--mut); transition:color .15s; }
.r15 .nav-links a:hover { color:var(--paper); }
.r15 .nav .btn-gold { padding:.6rem 1.25rem; font-size:.8rem; position:relative; z-index:1; }
@media(max-width:720px){ .r15 .nav-links { display:none; } .r15 .navw { padding:1rem 1.25rem 0; } }
@media(max-width:480px){ .r15 .nav-name { display:none; } }

/* progress rail */
.r15 .rail { position:fixed; top:0; left:0; height:2px; background:var(--gold); z-index:300; }

/* chapter HUD — glass chip */
.r15 .hud {
  position:fixed; left:var(--pad); bottom:1.75rem; z-index:150; border-radius:10px;
  display:flex; align-items:center; gap:.7rem; pointer-events:none; padding:.55rem .9rem;
}
.r15 .hud-n { font-size:.82rem; font-weight:500; color:var(--gold); }
.r15 .hud-bar { width:24px; height:1px; background:var(--line); }
.r15 .hud-t { font-size:.68rem; font-weight:500; letter-spacing:.2em; text-transform:uppercase; }
@media(max-width:900px){ .r15 .hud { display:none; } }

/* ─── HERO — raw video, no scrim, bottom-anchored ─── */
.r15 .hero { position:relative; min-height:100svh; display:flex; flex-direction:column; overflow:hidden; background:var(--ink); }
.r15 .hero-media { position:absolute; inset:0; }
.r15 .hero-inner {
  position:relative; z-index:2; flex:1; display:flex; flex-direction:column; justify-content:flex-end;
  padding:6.5rem var(--pad) calc(2.5rem + env(safe-area-inset-bottom));
}
.r15 .hero-grid { display:grid; grid-template-columns:1fr; gap:2rem; align-items:end; }
@media(min-width:1024px){ .r15 .hero-grid { grid-template-columns:1.4fr .6fr; } }
.r15 .hero-h { font-size:clamp(2.35rem,5.6vw,5.1rem); text-shadow:0 2px 30px rgba(0,0,0,.45); }
.r15 .hero-h .row { display:block; }
.r15 .hero-sub { font-size:clamp(1rem,1.6vw,1.15rem); color:var(--paper); opacity:.85; margin-top:1.1rem; max-width:44ch; text-shadow:0 1px 18px rgba(0,0,0,.5); }
.r15 .hero-cta { display:flex; gap:1rem; margin-top:1.9rem; flex-wrap:wrap; }
.r15 .hero-tagcard { justify-self:start; border-radius:14px; padding:.9rem 1.5rem; font-size:clamp(1.05rem,1.8vw,1.4rem); font-weight:300; letter-spacing:-.01em; white-space:nowrap; }
@media(min-width:1024px){ .r15 .hero-tagcard { justify-self:end; } }
.r15 .hero-foot { display:flex; justify-content:space-between; gap:1rem; margin-top:2.25rem; font-size:.66rem; font-weight:500; letter-spacing:.18em; text-transform:uppercase; color:rgba(246,246,244,.55); text-shadow:0 1px 12px rgba(0,0,0,.6); }
@media(max-width:860px){ .r15 .hero-foot span:first-child { display:none; } }

/* char reveal */
.r15 .ch-c { display:inline-block; will-change:transform,opacity; }

/* ─── TICKER ─── */
.r15 .ticker { overflow:hidden; border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:var(--ink); }
.r15 .ticker-row { display:flex; align-items:center; width:max-content; padding:1.05rem 0; animation:r15tick 34s linear infinite; white-space:nowrap; }
.r15 .ticker-item { font-size:.76rem; font-weight:400; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); padding:0 1.7rem; }
.r15 .ticker-sq { width:4px; height:4px; background:var(--gold); border-radius:50%; flex:none; }
@keyframes r15tick { from{transform:translateX(0)} to{transform:translateX(-50%)} }

/* ─── CHAPTERS (full-viewport cinematic beats) ─── */
.r15 .beat { position:relative; min-height:100svh; display:flex; flex-direction:column; justify-content:flex-end; overflow:hidden; background:var(--ink); }
.r15 .beat-media { position:absolute; inset:0; }
.r15 .beat-grad::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg, transparent 46%, rgba(6,6,6,.62) 88%); z-index:1; pointer-events:none; }
.r15 .beat-inner { position:relative; z-index:2; padding:7rem var(--pad) 5.5rem; }
.r15 .beat-h { font-size:clamp(2rem,5vw,4.6rem); max-width:28ch; text-shadow:0 2px 34px rgba(0,0,0,.5); }
.r15 .beat-chip { margin-bottom:1.4rem; }
.r15 .beat-side { position:absolute; right:var(--pad); bottom:5.5rem; z-index:2; }
@media(max-width:860px){ .r15 .beat-side { display:none; } }

/* centered beats (neither / payoff) */
.r15 .beat-c { justify-content:center; align-items:center; text-align:center; }
.r15 .beat-c .beat-inner { padding:7rem var(--pad); display:flex; flex-direction:column; align-items:center; }
.r15 .beat-c .beat-h { max-width:18ch; }

/* giant outlined ghosts — the logo/word living in the background */
.r15 .ghost-word {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  font-weight:500; letter-spacing:-.04em; white-space:nowrap;
  font-size:clamp(6rem,24vw,22rem); line-height:1;
  color:transparent; -webkit-text-stroke:1px rgba(246,246,244,.09);
  pointer-events:none; user-select:none;
}
.r15 .ghost-mark {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:clamp(340px,52vw,720px); color:rgba(246,246,244,.05); pointer-events:none;
}
.r15 .ghost-gold { -webkit-text-stroke-color:rgba(196,164,106,.16); }

/* neither strike */
.r15 .neither-w { position:relative; display:inline-block; }
.r15 .neither-line { position:absolute; left:-.06em; right:-.06em; top:53%; height:.07em; background:var(--gold); transform-origin:left center; }
.r15 .payoff-tail { font-size:clamp(1rem,1.8vw,1.2rem); color:var(--mut); margin-top:1.75rem; max-width:44ch; }

/* site collage for the "web company" beat */
.r15 .collage { position:absolute; inset:0; display:flex; gap:2px; }
.r15 .collage span { flex:1; overflow:hidden; }
.r15 .collage img { width:100%; height:100%; object-fit:cover; object-position:top; filter:brightness(.55) saturate(.9); }
@media(max-width:720px){ .r15 .collage span:nth-child(3) { display:none; } }

/* ─── SECTIONS (dark, glass) ─── */
.r15 .sec { position:relative; padding:clamp(6rem,12vh,9rem) var(--pad); background:var(--ink); overflow:hidden; }
.r15 .sec-inner { position:relative; z-index:2; max-width:1240px; margin-inline:auto; }
.r15 .sec-h { font-size:clamp(2.1rem,4.8vw,4.1rem); font-weight:400; letter-spacing:-.04em; line-height:1.06; margin-top:1.2rem; max-width:22ch; }
.r15 .sec-sub { font-size:1.02rem; color:var(--mut); max-width:58ch; line-height:1.8; margin-top:1.5rem; }

/* two parts — glass cards */
.r15 .parts { display:grid; grid-template-columns:1fr 1fr; gap:clamp(1.25rem,2.5vw,2rem); margin-top:3.25rem; }
@media(max-width:820px){ .r15 .parts { grid-template-columns:1fr; } }
.r15 .part { border-radius:18px; padding:clamp(1.75rem,3.5vw,2.75rem); }
.r15 .part > * { position:relative; z-index:1; }
.r15 .part-n { font-size:.72rem; font-weight:500; letter-spacing:.2em; color:var(--gold); margin-bottom:1.4rem; }
.r15 .part-t { font-size:clamp(1.6rem,3vw,2.3rem); font-weight:400; letter-spacing:-.03em; margin-bottom:.35rem; }
.r15 .part-d { font-size:.95rem; color:var(--mut); margin-bottom:1.6rem; }
.r15 .part ul { list-style:none; }
.r15 .part li { font-size:.98rem; color:var(--paper); opacity:.88; padding:.8rem 0 .8rem 1.4rem; border-top:1px solid var(--line); position:relative; }
.r15 .part li::before { content:''; position:absolute; left:0; top:1.35rem; width:5px; height:5px; background:var(--gold); border-radius:50%; }
.r15 .part-strip { display:flex; gap:6px; margin-top:1.6rem; }
.r15 .part-strip span { flex:1; aspect-ratio:16/10; overflow:hidden; border-radius:8px; }
.r15 .part-strip img { width:100%; height:100%; object-fit:cover; object-position:top; }

/* billboard body card */
.r15 .bill-card { border-radius:14px; padding:1.5rem 1.75rem; margin-top:1.9rem; max-width:56ch; font-size:1rem; line-height:1.8; color:var(--paper); }
.r15 .bill-card > span { position:relative; z-index:1; display:block; }
.r15 .bill-card em { color:var(--gold); font-style:normal; font-weight:500; }

/* ─── FILM MARQUEE ─── */
.r15 .marquee { position:relative; background:var(--ink); padding:clamp(2.5rem,5vw,4rem) 0; overflow:hidden; }
.r15 .mq-label { position:absolute; top:1.4rem; left:var(--pad); z-index:2; }
.r15 .mq-row { display:flex; gap:10px; width:max-content; margin-bottom:10px; }
.r15 .mq-row-a { animation:mqleft 46s linear infinite; }
.r15 .mq-row-b { animation:mqright 52s linear infinite; }
@keyframes mqleft { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes mqright { from{transform:translateX(-50%)} to{transform:translateX(0)} }
.r15 .mq-cell { position:relative; width:clamp(220px,24vw,340px); aspect-ratio:16/9; flex:none; overflow:hidden; border-radius:12px; background:var(--ink-2); }
.r15 .mq-cell img { width:100%; height:100%; object-fit:cover; }

/* ─── STATS ─── */
.r15 .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(1rem,2vw,1.5rem); margin-top:3.25rem; }
@media(max-width:720px){ .r15 .stats { grid-template-columns:1fr; } }
.r15 .stat { border-radius:16px; padding:clamp(1.5rem,3vw,2.25rem); }
.r15 .stat > * { position:relative; z-index:1; }
.r15 .stat-n { display:block; font-size:clamp(2.75rem,5.5vw,4.5rem); font-weight:300; letter-spacing:-.04em; line-height:1; }
.r15 .stat-l { display:block; font-size:.8rem; color:var(--mut); margin-top:.9rem; line-height:1.55; }
.r15 .team-note { font-size:1.02rem; color:var(--mut); max-width:60ch; line-height:1.8; margin-top:2.25rem; }
.r15 .team-strip { display:flex; gap:8px; margin-top:2.25rem; }
.r15 .team-strip span { flex:1; aspect-ratio:16/9; overflow:hidden; border-radius:10px; }
.r15 .team-strip img { width:100%; height:100%; object-fit:cover; }
@media(max-width:720px){ .r15 .team-strip { flex-wrap:wrap; } .r15 .team-strip span { flex:1 1 46%; } }

/* ─── STORY PANELS ─── */
.r15 .story { display:grid; grid-template-columns:1.05fr 1fr; gap:clamp(2rem,5vw,4.5rem); align-items:center; max-width:1240px; margin-inline:auto; }
.r15 .story.rev .story-media { order:2; }
@media(max-width:880px){ .r15 .story { grid-template-columns:1fr; gap:2rem; } .r15 .story.rev .story-media { order:0; } }
.r15 .story-wrap { padding:clamp(3.5rem,7vh,5.5rem) var(--pad); background:var(--ink); }
.r15 .frame { border-radius:16px; overflow:hidden; }
.r15 .frame > * { position:relative; z-index:1; }
.r15 .frame-bar { display:flex; align-items:center; gap:.45rem; padding:.75rem 1.1rem; border-bottom:1px solid var(--line); }
.r15 .frame-dot { width:7px; height:7px; border-radius:50%; border:1px solid var(--dim); }
.r15 .frame-url { margin-left:.6rem; font-size:.62rem; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); font-weight:500; }
.r15 .frame-shot { aspect-ratio:16/10; overflow:hidden; }
.r15 .frame-shot img { width:100%; height:100%; object-fit:cover; }
.r15 .slate { border-radius:16px; padding:clamp(1.5rem,3vw,2.25rem); display:flex; flex-direction:column; aspect-ratio:4/3; }
.r15 .slate > * { position:relative; z-index:1; }
.r15 .slate-row { display:flex; justify-content:space-between; align-items:center; gap:1rem; font-size:.64rem; font-weight:500; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); padding:.75rem 0; border-bottom:1px solid var(--line); }
.r15 .slate-row:first-child { border-top:1px solid var(--line); }
.r15 .slate-mid { flex:1; display:flex; flex-direction:column; justify-content:center; }
.r15 .slate-big { font-size:clamp(1.8rem,3.6vw,2.9rem); font-weight:400; letter-spacing:-.03em; line-height:1.1; }
.r15 .story-metric { display:flex; align-items:baseline; gap:1rem; margin-bottom:1.6rem; padding-bottom:1.4rem; border-bottom:1px solid var(--line); }
.r15 .story-metric-n { font-size:clamp(2.5rem,4.5vw,3.6rem); font-weight:300; letter-spacing:-.04em; line-height:1; color:var(--gold); }
.r15 .story-metric-l { font-size:.74rem; color:var(--mut); max-width:22ch; line-height:1.5; letter-spacing:.06em; text-transform:uppercase; font-weight:500; }
.r15 .story-idx { display:flex; align-items:center; gap:.9rem; margin-bottom:1.3rem; }
.r15 .story-idx .bar { width:36px; height:1px; background:var(--line); }
.r15 .story-client { font-size:clamp(1.7rem,3.4vw,2.6rem); font-weight:400; letter-spacing:-.03em; line-height:1.08; margin-bottom:.9rem; }
.r15 .story-head { font-size:1.02rem; font-weight:500; color:var(--gold); line-height:1.5; margin-bottom:1rem; }
.r15 .story-body { font-size:1rem; color:var(--mut); line-height:1.85; margin-bottom:1.4rem; }
.r15 .story-stat { display:inline-block; border-radius:10px; font-size:.74rem; font-weight:500; letter-spacing:.08em; text-transform:uppercase; padding:.75rem 1.1rem; }
.r15 .story-stat > span { position:relative; z-index:1; }

/* ─── VOICES ─── */
.r15 .voices { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(1rem,2vw,1.5rem); margin-top:3.25rem; }
@media(max-width:880px){ .r15 .voices { grid-template-columns:1fr; } }
.r15 .voice { border-radius:16px; padding:clamp(1.5rem,3vw,2.25rem); display:flex; flex-direction:column; gap:1.6rem; }
.r15 .voice > * { position:relative; z-index:1; }
.r15 .voice-mark { display:block; width:8px; height:8px; background:var(--gold); border-radius:50%; }
.r15 .voice-q { font-size:.98rem; color:var(--paper); opacity:.88; line-height:1.8; flex:1; }
.r15 .voice-m { display:inline-block; font-size:.62rem; font-weight:500; letter-spacing:.14em; text-transform:uppercase; color:var(--gold); margin-bottom:.7rem; }
.r15 .voice-n b { display:block; font-size:.88rem; font-weight:500; }
.r15 .voice-n span { font-size:.8rem; color:var(--mut); }

/* ─── CTA / BRIEF ─── */
.r15 .brief { display:grid; grid-template-columns:1.15fr .85fr; border-radius:18px; text-align:left; max-width:900px; margin:3rem auto 0; }
@media(max-width:760px){ .r15 .brief { grid-template-columns:1fr; } }
.r15 .brief > * { position:relative; z-index:1; }
.r15 .brief-form { padding:clamp(1.5rem,3vw,2.25rem); border-right:1px solid var(--line); display:flex; flex-direction:column; gap:1.4rem; }
@media(max-width:760px){ .r15 .brief-form { border-right:none; border-bottom:1px solid var(--line); } }
.r15 .brief-field { display:flex; flex-direction:column; gap:.45rem; }
.r15 .brief-field label { font-size:.64rem; font-weight:500; letter-spacing:.18em; text-transform:uppercase; color:var(--dim); }
.r15 .brief-field input, .r15 .brief-field textarea {
  background:transparent; border:0; border-bottom:1px solid var(--line);
  color:var(--paper); font-family:var(--fx); font-size:1.05rem; padding:.6rem 0;
  outline:none; resize:none; border-radius:0;
}
.r15 .brief-field input:focus, .r15 .brief-field textarea:focus { border-bottom-color:var(--gold); }
.r15 .brief-form .btn-gold { align-self:flex-start; margin-top:.3rem; }
@media(max-width:760px){ .r15 .brief-form .btn-gold { align-self:stretch; text-align:center; } }
.r15 .brief-side { padding:clamp(1.5rem,3vw,2.25rem); display:flex; flex-direction:column; gap:1.4rem; justify-content:center; }
.r15 .brief-side .k { font-size:.64rem; font-weight:500; letter-spacing:.18em; text-transform:uppercase; color:var(--dim); display:block; margin-bottom:.3rem; }
.r15 .brief-side a { font-size:.98rem; transition:color .15s; }
.r15 .brief-side a:hover { color:var(--gold); }
.r15 .brief-note { font-size:.7rem; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); font-weight:500; }
.r15 .cta-center { text-align:center; }
.r15 .cta-center .sec-h, .r15 .cta-center .sec-sub { margin-inline:auto; }

/* ─── WORK WALL ─── */
.r15 .work-head-row { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:1rem; }
.r15 .work-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:2.75rem; }
@media(max-width:1000px){ .r15 .work-grid { grid-template-columns:repeat(2,1fr); } }
@media(max-width:560px){ .r15 .work-grid { grid-template-columns:1fr; } }
.r15 .vcard { position:relative; aspect-ratio:16/9; overflow:hidden; cursor:pointer; background:var(--ink-2); border-radius:12px; }
.r15 .vcard-v { aspect-ratio:9/16; }
.r15 .vposter { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .6s cubic-bezier(.22,1,.36,1); }
.r15 .vcard:hover .vposter { transform:scale(1.05); }
.r15 .vshade { position:absolute; inset:0; background:rgba(6,6,6,.28); z-index:1; transition:background .25s; }
.r15 .vcard:hover .vshade { background:rgba(6,6,6,.04); }
.r15 .vcap { position:absolute; bottom:8px; left:8px; right:8px; padding:.6rem .9rem; z-index:2; display:flex; justify-content:space-between; align-items:baseline; gap:.5rem; border-radius:9px; }
.r15 .vcap > * { position:relative; z-index:1; }
.r15 .vcap .nm { font-size:.78rem; font-weight:500; letter-spacing:-.01em; }
.r15 .vcap .tg { font-size:.6rem; letter-spacing:.16em; text-transform:uppercase; color:var(--mut); font-weight:500; }
.r15 .vpl { position:absolute; top:.9rem; right:.9rem; z-index:2; font-size:.6rem; letter-spacing:.18em; text-transform:uppercase; border-radius:8px; padding:.4rem .7rem; opacity:0; transition:opacity .2s; }
.r15 .vcard:hover .vpl { opacity:1; }
@media(hover:none){ .r15 .vpl { opacity:1; } }
.r15 .reels-head { display:flex; align-items:center; gap:1rem; margin:2.75rem 0 1.1rem; }
.r15 .reels-head .bar { flex:1; height:1px; background:var(--line); }
.r15 .reels-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
@media(max-width:1000px){ .r15 .reels-grid { grid-template-columns:repeat(2,1fr); } }

/* ─── FOOTER ─── */
.r15 .foot { padding:4rem var(--pad) 2.5rem; background:var(--ink); border-top:1px solid var(--line); position:relative; overflow:hidden; }
.r15 .foot-inner { max-width:1240px; margin-inline:auto; position:relative; z-index:1; }
.r15 .foot-wm { font-size:clamp(2.2rem,9vw,7.5rem); font-weight:400; letter-spacing:-.04em; white-space:nowrap; color:transparent; -webkit-text-stroke:1px rgba(246,246,244,.16); margin-bottom:3rem; }
.r15 .foot-top { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:2rem; margin-bottom:2.75rem; }
.r15 .foot-brand { display:flex; align-items:center; gap:.7rem; color:var(--mut); }
.r15 .foot-mark { width:22px; height:22px; color:var(--paper); }
.r15 .foot-links { display:flex; flex-wrap:wrap; gap:1.75rem; }
.r15 .foot-links a { font-size:.82rem; color:var(--mut); transition:color .15s; }
.r15 .foot-links a:hover { color:var(--paper); }
.r15 .foot-base { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding-top:2rem; border-top:1px solid var(--line); }
.r15 .foot-sig { font-size:.9rem; font-weight:500; letter-spacing:-.01em; color:var(--mut); }
.r15 .foot-copy { font-size:.72rem; color:var(--dim); }

/* ─── MODAL ─── */
.r15 .modal { position:fixed; inset:0; z-index:900; background:rgba(6,6,6,.9); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:1rem; }
.r15 .modal-box { width:100%; max-width:960px; border-radius:16px; }
.r15 .modal-box > * { position:relative; z-index:1; }
.r15 .modal-box.portrait { max-width:min(400px, 92vw); }
.r15 .modal-head { display:flex; align-items:center; justify-content:space-between; padding:.9rem 1.25rem; border-bottom:1px solid var(--line); }
.r15 .modal-head span { font-size:.88rem; font-weight:500; }
.r15 .modal-head button { font-size:1.5rem; line-height:1; color:var(--mut); width:32px; height:32px; display:flex; align-items:center; justify-content:center; transition:color .15s; }
.r15 .modal-head button:hover { color:var(--paper); }
.r15 .modal-vid { position:relative; aspect-ratio:16/9; }
.r15 .modal-box.portrait .modal-vid { aspect-ratio:9/16; max-height:80vh; margin-inline:auto; }
.r15 .modal-vid iframe { position:absolute; inset:0; width:100%; height:100%; border:none; }

@media(prefers-reduced-motion: reduce){
  .r15 .ticker-row, .r15 .mq-row-a, .r15 .mq-row-b { animation:none; }
}
`;

// ─── MOTION PRIMITIVES ────────────────────────────────────────────────────────

const EASE = [0.22, 1, 0.36, 1];

/** Character-by-character entrance (reference spec: 30ms stagger, x -18px, 500ms).
 *  `lines` = array of lines; each line = array of segments {t, cls}.
 *  Trigger: `auto` (hero — fires after `delay`s on mount) or in-view once. */
function Chars({ lines, delay = 0.2, auto = false, sq = false, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [on, setOn] = useState(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced) { setOn(true); return; }
    if (auto) {
      const t = setTimeout(() => setOn(true), delay * 1000);
      return () => clearTimeout(t);
    }
    if (inView) setOn(true);
  }, [auto, inView, delay, reduced]);

  let ci = 0;
  return (
    <span ref={ref} className={className}>
      {lines.map((segs, li) => (
        // authored line breaks hold only when there ARE multiple lines; a
        // single-line Chars stays inline so composites (the neither strike) flow
        <span style={lines.length > 1 ? { display: 'block' } : undefined} key={li}>
          {segs.map((seg, si) => {
            const isLastSeg = li === lines.length - 1 && si === segs.length - 1;
            // words never break — chars animate inside a nowrap word span
            const words = seg.t.split(/(\s+)/);
            const lastWordIdx = (() => { let k = -1; words.forEach((w, i) => { if (w && !/^\s+$/.test(w)) k = i; }); return k; })();
            return words.map((w, wi) => {
              if (!w) return null;
              if (/^\s+$/.test(w)) { ci++; return ' '; }
              const bondSq = sq && isLastSeg && wi === lastWordIdx;
              return (
                <span key={si + '-' + wi} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                  {Array.from(w).map((c, i) => {
                    const d = (auto ? 0 : delay) + ci++ * 0.03;
                    return (
                      <span
                        key={i}
                        className={'ch-c ' + (seg.cls || '')}
                        style={{
                          opacity: on ? 1 : 0,
                          transform: on ? 'translateX(0)' : 'translateX(-18px)',
                          transition: `opacity .5s ease ${d}s, transform .5s ease ${d}s`,
                        }}
                      >
                        {c}
                      </span>
                    );
                  })}
                  {bondSq ? (
                    <span
                      className="sq"
                      style={{ opacity: on ? 1 : 0, transition: `opacity .5s ease ${(auto ? 0 : delay) + ci * 0.03}s` }}
                    />
                  ) : null}
                </span>
              );
            });
          })}
        </span>
      ))}
    </span>
  );
}

/** Fade-in after delay (reference FadeIn). Works on mount (auto) or in view.
 *  CSS transitions, not rAF — background/occluded tabs throttle rAF to zero,
 *  which left rAF-driven fades stuck at opacity 0. */
function Fade({ children, delay = 0, dur = 1, auto = false, y = 0, className = '', style, ...rest }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [on, setOn] = useState(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced) { setOn(true); return; }
    if (auto) {
      const t = setTimeout(() => setOn(true), delay * 1000);
      return () => clearTimeout(t);
    }
    if (inView) setOn(true);
  }, [auto, inView, delay, reduced]);

  const d = auto ? 0 : delay;
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on || !y ? 'none' : `translateY(${y}px)`,
        transition: `opacity ${dur}s cubic-bezier(.22,1,.36,1) ${d}s, transform ${dur}s cubic-bezier(.22,1,.36,1) ${d}s`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Count-up number, honors non-numeric metrics by revealing them instead */
function Counter({ value, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.7 });
  const [txt, setTxt] = useState('0');
  const m = String(value).match(/^([\d,]+)(.*)$/);

  useEffect(() => {
    if (!inView) return;
    if (!m) { setTxt(String(value)); return; }
    const target = parseInt(m[1].replace(/,/g, ''), 10);
    const suffix = m[2] || '';
    const t0 = performance.now(), dur = 1300;
    let raf;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const n = Math.round(target * eased);
      setTxt(n.toLocaleString('en-US') + suffix);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref} className={className}>{m ? txt : value}</span>;
}

/** Plain text with the gold square period bonded to the last word (no orphan wrap). */
function SqText({ text }) {
  const words = text.split(' ');
  const last = words.pop();
  return (
    <>
      {words.length ? words.join(' ') + ' ' : ''}
      <span style={{ whiteSpace: 'nowrap' }}>{last}<span className="sq" /></span>
    </>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function VCinematicGlass() {
  const [video, setVideo] = useState(null);
  const [prog, setProg] = useState(0);
  const [ch, setCh] = useState(0);
  const [brief, setBrief] = useState({ name: '', co: '', msg: '' });
  const heroRef = useRef(null);
  const { scrollYProgress: heroProg } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(heroProg, [0, 1], ['0%', '14%']);

  const sendBrief = e => {
    e.preventDefault();
 const subject = `New project, ${brief.name}${brief.co ? ' (' + brief.co + ')' : ''}`;
 const body = `Hi AOM,%0D%0A%0D%0A${encodeURIComponent(brief.msg)}%0D%0A%0D%0A, ${encodeURIComponent(brief.name)}${brief.co ? '·' + encodeURIComponent(brief.co) : ''}`;
    window.location.href = `mailto:hello@aheadofmarket.com?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  // scroll progress + lenis smooth scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProg(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => window.removeEventListener('scroll', onScroll);
    }
    let lenis, raf, alive = true;
    const onAnchor = e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -24, duration: 1.4 });
      else el.scrollIntoView({ behavior: 'smooth' });
    };
    document.addEventListener('click', onAnchor);
    import('lenis').then(({ default: Lenis }) => {
      if (!alive) return;
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      const loop = t => { lenis.raf(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      alive = false;
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onAnchor);
      if (raf) cancelAnimationFrame(raf);
      if (lenis) lenis.destroy();
    };
  }, []);

  // chapter HUD — watch the center band of the viewport
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.r15 [data-ch]'));
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setCh(Number(e.target.dataset.ch)); });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // lock body scroll under modal
  useEffect(() => {
    document.body.style.overflow = video ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [video]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="r15">
        <style>{CSS}</style>
        <div className="rail" style={{ width: prog + '%' }} />

        {/* chapter HUD — appears once the story starts (on ch 0 it collides with the hero foot) */}
        {ch > 0 && (
          <div className="hud lg" aria-hidden="true">
            <span className="hud-n">{String(ch).padStart(2, '0')}</span>
            <span className="hud-bar" />
            <span className="hud-t">{CHAPTERS[ch]}</span>
          </div>
        )}

        {/* NAV — floating liquid glass */}
        <div className="navw">
          <nav className="nav lg">
            <a className="nav-brand" href="/">
              <BrandMark kind="mono" className="nav-mark" />
              <span className="nav-name">Ahead of Market</span>
            </a>
            <div className="nav-links">
              <a href="#story">Story</a>
              <a href="#work">Work</a>
              <a href="#contact">Contact</a>
            </div>
            <a className="btn-gold" href="#contact">Start a project</a>
          </nav>
        </div>

        {/* CH 00 — THE HOOK: raw footage, no scrim, bottom-anchored */}
        <header className="hero" data-ch="0" ref={heroRef}>
          <motion.div className="hero-media" style={{ y: heroY }}>
            <LazyGumlet id={HERO_REEL} eager filter="none" bleed={1.14} offsetY={-28} />
          </motion.div>
          <div className="hero-inner">
            <div className="hero-grid">
              <div>
                <Fade auto delay={0.15} dur={0.7}>
 <span className="chip lg"><i className="csq" />Phoenix, AZ, Since 2020</span>
                </Fade>
                <h1 className="hero-h dp" style={{ marginTop: '1.4rem' }}>
                  <Chars
                    auto
                    delay={0.2}
                    sq
                    lines={[
                      [{ t: 'We make companies' }],
                      [{ t: 'impossible to ignore' }],
                    ]}
                  />
                </h1>
                <Fade auto delay={0.8} dur={1}>
 <p className="hero-sub">Hi. We're Ahead of Market, a storytelling company from Phoenix, AZ.</p>
                </Fade>
                <Fade auto delay={1.2} dur={1}>
                  <div className="hero-cta">
                    <a className="btn-gold" href="#contact">Start a conversation</a>
                    <a className="btn-glass lg" href="#work">See our work</a>
                  </div>
                </Fade>
              </div>
              <Fade auto delay={1.4} dur={1}>
                <div className="hero-tagcard lg">Story. Film. Web. Ads<span className="sq" /></div>
              </Fade>
            </div>
            <Fade auto delay={1.6} dur={1}>
              <div className="hero-foot">
 <span>Now playing: Journey to Gary Vee, our documentary work</span>
                <span>Scroll to meet us ↓</span>
              </div>
            </Fade>
          </div>
        </header>

        {/* TICKER */}
        <div className="ticker" aria-hidden="true">
          <div className="ticker-row">
            {[...TICKER, ...TICKER].map((t, i) => (
              <React.Fragment key={i}>
                <span className="ticker-item">{t}</span>
                <span className="ticker-sq" />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* CH 01 — WHO WE ARE: four cinematic beats */}
        <div id="story">
          {/* beat 1 — the video company, over our own film footage */}
          <section className="beat" data-ch="1">
            <div className="beat-media beat-grad">
              <LazyGumlet id={FILM_REEL} filter="none" bleed={1.14} offsetY={-28} />
            </div>
            <div className="beat-inner">
              <Fade dur={0.7}>
 <div className="beat-chip"><span className="chip lg"><i className="csq" />So, who are we, exactly?</span></div>
              </Fade>
              <h2 className="beat-h dp">
                <Chars
                  sq
                  lines={[
                    [{ t: 'Many companies around Phoenix', cls: 'dim' }],
                    [{ t: 'know us as a ', cls: 'dim' }, { t: 'video company' }],
                  ]}
                />
              </h2>
            </div>
            <div className="beat-side">
              <Fade delay={0.4} dur={0.8}>
 <span className="chip lg"><i className="csq" />Frames from our films, playing behind this</span>
              </Fade>
            </div>
          </section>

          {/* beat 2 — the web company, over the sites we built */}
          <section className="beat" data-ch="1">
            <div className="beat-media collage beat-grad" aria-hidden="true">
              <span><img src="/hero-sites/ambition.jpg" alt="" loading="lazy" /></span>
              <span><img src="/hero-sites/space-rising.jpg" alt="" loading="lazy" /></span>
              <span><img src="/hero-sites/valor.jpg" alt="" loading="lazy" /></span>
            </div>
            <div className="beat-inner">
              <h2 className="beat-h dp">
                <Chars
                  sq
                  lines={[
                    [{ t: 'Others know us as a', cls: 'dim' }],
                    [{ t: 'web development company' }],
                  ]}
                />
              </h2>
            </div>
            <div className="beat-side">
              <Fade delay={0.4} dur={0.8}>
 <span className="chip lg"><i className="csq" />Sites we've built, standing behind this</span>
              </Fade>
            </div>
          </section>

          {/* beat 3 — neither */}
          <section className="beat beat-c" data-ch="1">
            <span className="ghost-word" aria-hidden="true">neither</span>
            <div className="beat-inner">
              <h2 className="beat-h dp">
                <Chars lines={[[{ t: "We're actually ", cls: 'dim' }]]} />
                <span className="neither-w">
                  <Chars lines={[[{ t: 'neither' }]]} />
                  <motion.span
                    className="neither-line"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
                  />
                </span>
                <Chars sq lines={[[{ t: ' of those things', cls: 'dim' }]]} />
              </h2>
            </div>
          </section>

          {/* beat 4 — the payoff, monogram towering behind */}
          <section className="beat beat-c" data-ch="1">
            <BrandMark kind="mono" className="ghost-mark" />
            <div className="beat-inner">
              <Fade dur={0.7}>
                <div className="beat-chip"><span className="chip lg"><i className="csq" />What we actually are</span></div>
              </Fade>
              <h2 className="beat-h dp">
                <Chars
                  sq
                  lines={[
                    [{ t: "We're a ", cls: 'dim' }, { t: 'storytelling company', cls: 'gold' }],
                  ]}
                />
              </h2>
              <Fade delay={0.9} dur={1}>
 <p className="payoff-tail">, we just happen to make videos and web apps often.</p>
              </Fade>
            </div>
          </section>
        </div>

        {/* CH 02 — WHAT WE DO */}
        <section className="sec" data-ch="2">
          <span className="ghost-word" aria-hidden="true">two parts</span>
          <div className="sec-inner">
            <Fade><span className="lb">What we actually do</span></Fade>
            <h2 className="sec-h">
              <Chars sq lines={[[{ t: 'Everything we make falls into ' }, { t: 'two parts', cls: 'gold' }]]} />
            </h2>
            <div className="parts">
              <Fade className="part lg" delay={0.1}>
                <div className="part-n">01</div>
                <h3 className="part-t">Marketing</h3>
                <p className="part-d">The materials your message stands on.</p>
                <ul>
                  <li>Websites &amp; web applications</li>
                  <li>Brand films &amp; video series</li>
                  <li>Quizzes &amp; interactive tools for prospects</li>
                  <li>Photography &amp; creative assets</li>
                </ul>
                <div className="part-strip" aria-hidden="true">
                  <span><img src="/hero-sites/ambition.jpg" alt="" /></span>
                  <span><img src="/hero-sites/space-rising.jpg" alt="" /></span>
                  <span><img src="/hero-sites/valor.jpg" alt="" /></span>
                </div>
              </Fade>
              <Fade className="part lg" delay={0.25}>
                <div className="part-n">02</div>
                <h3 className="part-t">Promotion</h3>
                <p className="part-d">How it gets out into the world.</p>
                <ul>
                  <li>Google &amp; Meta ad campaigns</li>
                  <li>Influencer posts &amp; partnerships</li>
                  <li>Email &amp; text-message campaigns</li>
                  <li>SEO &amp; content distribution</li>
                </ul>
                <div className="part-strip" aria-hidden="true">
                  <span><img src={poster('698a596eaec3d4e420c22a9a', 480)} alt="" /></span>
                  <span><img src={poster('698a5391fc23d3d76fa7306c', 480)} alt="" /></span>
                  <span><img src={poster('698a5a8b873071aec5c99c6f', 480)} alt="" /></span>
                </div>
              </Fade>
            </div>
          </div>
        </section>

        {/* CH 03 — THE BILLBOARD: raw footage under the line */}
        <section className="beat" data-ch="3">
          <div className="beat-media beat-grad">
            <LazyGumlet id={BILL_REEL} filter="none" bleed={1.14} offsetY={-28} />
          </div>
          <div className="beat-inner">
            <Fade dur={0.7}>
              <div className="beat-chip"><span className="chip lg"><i className="csq" />The billboard test</span></div>
            </Fade>
            <h2 className="beat-h dp">
              <Chars
                lines={[
                  [{ t: '"A billboard does no good' }],
                  [{ t: 'in your ' }, { t: 'basement', cls: 'gold' }, { t: '."' }],
                ]}
              />
            </h2>
            <Fade delay={0.5} dur={0.9}>
              <div className="bill-card lg">
                <span>
 A website or a video is the same, it doesn't help if you don't have a strategy to get it out.
                  That's where we come in. We make the marketing materials, but <em>first</em> we figure out exactly how they'll get distributed most effectively.
                </span>
              </div>
            </Fade>
          </div>
        </section>

        {/* FILM MARQUEE — the work as texture */}
        <section className="marquee" data-ch="3" aria-label="Frames from recent AOM work">
          <span className="mq-label chip lg"><i className="csq" />Real frames · Real clients</span>
          <div>
            <div className="mq-row mq-row-a">
              {[...PORTFOLIO.filter(p => !p.v), ...PORTFOLIO.filter(p => !p.v)].map((p, i) => (
                <span className="mq-cell" key={'a' + i}><img src={poster(p.id, 480)} alt="" /></span>
              ))}
            </div>
            <div className="mq-row mq-row-b">
              {(() => {
                const half = [...PORTFOLIO.filter(p => p.v), ...PORTFOLIO.filter(p => !p.v).slice(4, 8)];
                return [...half, ...half].map((p, i) => (
                  <span className="mq-cell" key={'b' + i}><img src={poster(p.id, 480)} alt="" /></span>
                ));
              })()}
            </div>
          </div>
        </section>

        {/* CH 04 — THE TEAM */}
        <section className="sec" data-ch="4">
          <div className="sec-inner">
            <Fade><span className="lb">Who we are</span></Fade>
            <h2 className="sec-h" style={{ maxWidth: 'none' }}>
              <Chars sq lines={[[{ t: 'A small team that has ' }, { t: 'done a lot', cls: 'gold' }]]} />
            </h2>
            <div className="stats">
              <Fade className="stat lg" delay={0.05}>
                <span className="stat-n"><Counter value="100+" /></span>
                <span className="stat-l">Projects shipped since 2020</span>
              </Fade>
              <Fade className="stat lg" delay={0.15}>
                <span className="stat-n"><Counter value="3" /></span>
 <span className="stat-l">Industries, Tech, Construction, Nonprofits</span>
              </Fade>
              <Fade className="stat lg" delay={0.25}>
                <span className="stat-n"><Counter value="8+" /></span>
                <span className="stat-l">Years in commercial film, news &amp; media</span>
              </Fade>
            </div>
            <Fade delay={0.2}>
              <p className="team-note">
                Our team comes from commercial film production, local news, national media, and creative agencies.
 We've worked across Phoenix, nationally, and internationally, always story-first.
              </p>
            </Fade>
            <Fade delay={0.3}>
              <div className="team-strip" aria-hidden="true">
                <span><img src={poster('698a6296fc23d3d76fa8d992', 480)} alt="" /></span>
                <span><img src={poster('698a5ef5fc23d3d76fa87ef4', 480)} alt="" /></span>
                <span><img src={poster('698a584faec3d4e420c20fef', 480)} alt="" /></span>
                <span><img src={poster('698a5b86fc23d3d76fa82ece', 480)} alt="" /></span>
              </div>
            </Fade>
          </div>
        </section>

        {/* CH 05 — BRIDGE INTO THE WORK */}
        <section className="sec" data-ch="5" style={{ textAlign: 'center' }}>
          <span className="ghost-word ghost-gold" aria-hidden="true">the work</span>
          <div className="sec-inner">
 <Fade><span className="lb">Enough about us, here's what that looks like</span></Fade>
            <h2 className="sec-h" style={{ marginInline: 'auto' }}>
              <Chars sq lines={[[{ t: 'Now, the ' }, { t: 'work', cls: 'gold' }]]} />
            </h2>
          </div>
        </section>

        {/* CH 05 — THE WORK (four story panels) */}
        {STORIES.map((s, i) => (
          <div className="story-wrap" data-ch="5" key={s.client}>
            <div className={'story' + (i % 2 ? ' rev' : '')}>
              <div className="story-media">
                <Fade y={30}>
                  {s.media === 'site' ? (
                    <div className="frame lg">
                      <div className="frame-bar">
                        <span className="frame-dot" /><span className="frame-dot" /><span className="frame-dot" />
                        <span className="frame-url">{s.client}</span>
                      </div>
                      <div className="frame-shot">
 <img src={s.src} alt={`${s.client}, website by Ahead of Market`} loading="lazy" />
                      </div>
                    </div>
                  ) : (
                    <div className="slate lg">
                      <div className="slate-row"><span>Production</span><span>{s.slate.title}</span></div>
                      <div className="slate-mid">
                        <span className="slate-big">{s.slate.roll}<span className="sq" /></span>
                      </div>
                      <div className="slate-row"><span>Scene</span><span>{s.slate.scene}</span></div>
                      <div className="slate-row"><span>Take</span><span>{s.slate.take}</span></div>
                    </div>
                  )}
                </Fade>
              </div>
              <Fade delay={0.15} y={30} className="story-copy">
                <div className="story-metric">
                  <span className="story-metric-n"><Counter value={s.big} /></span>
                  <span className="story-metric-l">{s.bigLabel}</span>
                </div>
                <div className="story-idx">
 <span className="lb">{i === 0 ? 'Some recent work, ' : ''}{String(i + 1).padStart(2, '0')} / {String(STORIES.length).padStart(2, '0')}</span>
                  <span className="bar" />
                  <span className="lb">{s.tag}</span>
                </div>
                <h3 className="story-client"><SqText text={s.client} /></h3>
                <p className="story-head">{s.headline}</p>
                <p className="story-body">{s.body}</p>
                <span className="story-stat lg"><span>{s.stat}</span></span>
              </Fade>
            </div>
          </div>
        ))}

        {/* CH 06 — VOICES */}
        <section className="sec" data-ch="6">
          <div className="sec-inner">
            <Fade><span className="lb">Voices</span></Fade>
            <h2 className="sec-h">
              <Chars sq lines={[[{ t: 'What clients ' }, { t: 'say', cls: 'gold' }]]} />
            </h2>
            <div className="voices">
              {VOICES.map((v, i) => (
                <Fade key={v.n} delay={i * 0.12} className="voice lg">
                  <span className="voice-mark" aria-hidden="true" />
                  <p className="voice-q">{v.q}</p>
                  <div>
                    <div className="voice-m">{v.m}</div>
                    <div className="voice-n">
                      <b>{v.n}</b>
                      <span>{v.c}</span>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </section>

        {/* CH 07 — THE CONVERSATION */}
        <section className="sec cta-center" data-ch="7" id="contact">
          <BrandMark kind="mono" className="ghost-mark" />
          <div className="sec-inner">
            <Fade><span className="lb" style={{ color: 'var(--gold)' }}>Ready when you are</span></Fade>
            <h2 className="sec-h">
              <Chars sq lines={[[{ t: 'It all starts with a ' }, { t: 'conversation', cls: 'gold' }]]} />
            </h2>
            <Fade delay={0.4}>
              <p className="sec-sub">
 By now you know us a little. We'd love to learn about what you're working on, and how we might be able to help.
              </p>
            </Fade>
            <Fade delay={0.55}>
              <form className="brief lg" onSubmit={sendBrief}>
                <div className="brief-form">
                  <div className="brief-field">
                    <label htmlFor="bf-name">Your name</label>
                    <input id="bf-name" required value={brief.name} onChange={e => setBrief({ ...brief, name: e.target.value })} autoComplete="name" />
                  </div>
                  <div className="brief-field">
                    <label htmlFor="bf-co">Company</label>
                    <input id="bf-co" value={brief.co} onChange={e => setBrief({ ...brief, co: e.target.value })} autoComplete="organization" />
                  </div>
                  <div className="brief-field">
                    <label htmlFor="bf-msg">What are you making?</label>
                    <textarea id="bf-msg" rows={3} required value={brief.msg} onChange={e => setBrief({ ...brief, msg: e.target.value })} />
                  </div>
                  <button className="btn-gold" type="submit">Start the conversation</button>
                </div>
                <div className="brief-side">
                  <div>
                    <span className="k">Email</span>
                    <a href="mailto:hello@aheadofmarket.com">hello@aheadofmarket.com</a>
                  </div>
                  <div>
                    <span className="k">Phone</span>
                    <a href="tel:6023732164">602 373 2164</a>
                  </div>
                  <span className="brief-note">We reply within 24 hours.</span>
                </div>
              </form>
            </Fade>
          </div>
        </section>

        {/* CLOSING REEL — PORTFOLIO */}
        <section className="sec" id="work" data-ch="7">
          <div className="sec-inner">
            <Fade>
              <div className="work-head-row">
                <div>
                  <span className="lb">Our work</span>
                  <h2 className="sec-h">
                    100+ projects.<br /><SqText text="Here are a few" />
                  </h2>
                </div>
                <span className="lb">Tap any film to play</span>
              </div>
            </Fade>
            <div className="work-grid">
              {PORTFOLIO.filter(p => !p.v).map((p, i) => (
                <motion.div
                  className="vcard"
                  key={p.t}
                  onClick={() => setVideo(p)}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, ease: EASE, delay: (i % 4) * 0.07 }}
                >
                  <img className="vposter" src={poster(p.id, 800)} alt={p.t} loading="lazy" />
                  <div className="vshade" />
                  <span className="vpl lg">Play</span>
                  <div className="vcap lg">
                    <span className="nm">{p.t}</span>
                    <span className="tg">{p.tag}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <Fade className="reels-head">
 <span className="lb">Reels, made for the feed</span>
              <span className="bar" />
            </Fade>
            <div className="reels-grid">
              {PORTFOLIO.filter(p => p.v).map((p, i) => (
                <motion.div
                  className="vcard vcard-v"
                  key={p.t}
                  onClick={() => setVideo(p)}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, ease: EASE, delay: (i % 4) * 0.07 }}
                >
                  <img className="vposter" src={poster(p.id, 800)} alt={p.t} loading="lazy" />
                  <div className="vshade" />
                  <span className="vpl lg">Play</span>
                  <div className="vcap lg">
                    <span className="nm">{p.t}</span>
                    <span className="tg">{p.tag}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="foot">
          <div className="foot-inner">
            <Fade>
              <div className="foot-wm" aria-hidden="true">Ahead of Market<span className="sq" /></div>
            </Fade>
            <div className="foot-top">
              <div className="foot-brand">
                <BrandMark kind="mono" className="foot-mark" />
                <span className="nav-name">Ahead of Market</span>
              </div>
              <div className="foot-links">
                <a href="#story">Story</a>
                <a href="#work">Work</a>
                <a href="#contact">Contact</a>
                <a href="mailto:hello@aheadofmarket.com">hello@aheadofmarket.com</a>
                <a href="tel:6023732164">602 373 2164</a>
              </div>
            </div>
            <div className="foot-base">
              <span className="foot-sig"><SqText text="A storytelling studio" /></span>
              <span className="foot-copy">© 2026 Ahead of Market. All rights reserved.</span>
            </div>
          </div>
        </footer>

        {/* VIDEO MODAL */}
        {video && (
          <div className="modal" onClick={e => e.target === e.currentTarget && setVideo(null)}>
            <div className={'modal-box lg' + (video.v ? ' portrait' : '')}>
              <div className="modal-head">
                <span>{video.t}</span>
                <button onClick={() => setVideo(null)} aria-label="Close">×</button>
              </div>
              <div className="modal-vid">
                <iframe src={embed(video.id)} title={video.t} allow="autoplay; fullscreen; encrypted-media" allowFullScreen />
              </div>
            </div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}