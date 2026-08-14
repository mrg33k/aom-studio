import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, MotionConfig } from 'framer-motion';
import LazyGumlet from '../../components/home/LazyGumlet';
import BrandMark from '../../components/home/BrandMark';

// Mounted at /r5 for review; promote to / when approved. Mission: aheadofmarket.com:home (R9).
// "The story is the site" — a cinematic chapter-scroll on the AOM editorial system:
// obsidian + ivory + one champagne-gold accent, Bricolage UPPERCASE display, square
// corners, hairline rules, flat surfaces. Copy is Patrik's R5 narrative, verbatim.

const TICKER = ["Skylar", "PA'LA", 'Ambition Mechanical', 'ISA Energy', 'Brandon Wiley', 'Space Rising', 'Included Health', 'Intelliplay', 'Valor to Victory', 'Kohrs'];

const STORIES = [
  {
    client: 'ISA Energy', tag: 'Energy · Film', media: 'slate',
 big: '3', bigLabel: 'films, demo, validation, brand',
    slate: { title: 'ISA ENERGY', roll: 'A THREE-FILM SERIES', scene: '3 ACTS · 9 BEATS · 4 SUBJECTS', take: 'LIVE IN INVESTOR MEETINGS' },
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
    slate: { title: 'INCLUDED HEALTH', roll: 'A FILM SERIES', scene: 'HEALTHCARE · NATIONWIDE', take: 'SCREENED AT INSPIRE SUMMIT' },
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

const embed = id => `https://play.gumlet.io/embed/${id}?autoplay=true&preload=false&loop=false&background=false&disable_player_controls=false`;
const poster = (id, w = 800) => `https://video.gumlet.io/697678222b8b17fbb707acef/${id}/thumbnail-1-0.png?format=auto&w=${w}`;

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
.r9 {
  --ink:#0B0B0B; --ink-800:#141412; --ink-700:#26261F; --ink-500:#6E6E66;
  --paper:#F6F6F4; --paper-alt:#EFEEE9; --line:#DCD9D2; --line-dark:rgba(246,246,244,.14);
  --stone:#A8A49C; --gold:#C4A46A; --gold-deep:#A8884C;
  --dp:'Bricolage Grotesque',system-ui,Helvetica,Arial,sans-serif;
  --tx:'Schibsted Grotesk',system-ui,Helvetica,Arial,sans-serif;
  --pad:clamp(1.5rem,5vw,4.5rem);
  font-family:var(--tx); color:var(--ink); background:var(--ink);
  font-size:16px; line-height:1.6;
}
.r9 *, .r9 *::before, .r9 *::after { box-sizing:border-box; margin:0; padding:0; }
.r9 a { color:inherit; text-decoration:none; }
.r9 button { font:inherit; cursor:pointer; border:none; background:none; }
.r9 a:focus-visible, .r9 button:focus-visible, .r9 input:focus-visible, .r9 textarea:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }
.r9 img { display:block; max-width:100%; }
.r9 .gold { color:var(--gold); }

/* the signature: square gold period block */
.r9 .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* display type — always uppercase */
.r9 .dp { font-family:var(--dp); text-transform:uppercase; letter-spacing:-.01em; font-weight:800; line-height:.98; }

/* boxed label */
.r9 .boxed {
  display:inline-block; border:1px solid currentColor; padding:.45em .8em;
  font-family:var(--tx); font-size:.68rem; font-weight:600;
  letter-spacing:.18em; text-transform:uppercase;
}

/* small index label */
.r9 .idx { font-family:var(--tx); font-size:.68rem; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:var(--stone); }

/* hairline */
.r9 .rule { border:0; border-top:1px solid var(--line); }
.r9 .on-dark .rule { border-top-color:var(--line-dark); }

/* buttons — square, flat */
.r9 .btn-gold {
  display:inline-block; background:var(--gold); color:var(--ink); white-space:nowrap;
  font-family:var(--tx); font-size:.8rem; font-weight:700;
  letter-spacing:.1em; text-transform:uppercase; padding:1rem 1.75rem;
  transition:background .18s;
}
.r9 .btn-gold:hover { background:var(--gold-deep); }
.r9 .btn-ghost {
  display:inline-block; border:1px solid var(--stone); color:var(--paper); white-space:nowrap;
  font-family:var(--tx); font-size:.8rem; font-weight:600;
  letter-spacing:.1em; text-transform:uppercase; padding:1rem 1.75rem;
  transition:border-color .18s, color .18s;
}
.r9 .btn-ghost:hover { border-color:var(--paper); }
.r9 .on-light .btn-ghost { border-color:var(--ink-700); color:var(--ink); }
.r9 .on-light .btn-ghost:hover { border-color:var(--ink); }

/* ─── NAV (masthead) ─── */
.r9 .nav {
  position:fixed; top:0; left:0; right:0; z-index:200;
  display:flex; align-items:center; justify-content:space-between;
  padding:0 var(--pad); height:64px;
  background:rgba(11,11,11,.86); backdrop-filter:blur(10px);
  border-bottom:1px solid var(--line-dark); color:var(--paper);
}
.r9 .nav-brand { display:flex; align-items:center; gap:.7rem; }
.r9 .nav-mark { width:26px; height:26px; color:var(--paper); }
.r9 .nav-name { font-family:var(--dp); font-size:.85rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
.r9 .nav-links { display:flex; gap:2.25rem; }
.r9 .nav-links a { font-size:.72rem; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--stone); transition:color .15s; }
.r9 .nav-links a:hover { color:var(--paper); }
.r9 .nav .btn-gold { padding:.7rem 1.25rem; }
@media(max-width:720px){ .r9 .nav-links { display:none; } .r9 .nav { padding:0 1.25rem; } .r9 .nav .btn-gold { padding:.6rem 1rem; font-size:.68rem; } }
@media(max-width:480px){ .r9 .nav-name { display:none; } }

/* progress rail */
.r9 .rail { position:fixed; top:0; left:0; height:2px; background:var(--gold); z-index:300; }

/* chapter HUD */
.r9 .hud {
  position:fixed; left:var(--pad); bottom:2rem; z-index:150;
  display:flex; align-items:center; gap:.75rem; pointer-events:none;
  background:var(--ink); color:var(--paper); border:1px solid var(--line-dark);
  padding:.55rem .9rem;
}
.r9 .hud-n { font-family:var(--dp); font-size:1rem; font-weight:800; letter-spacing:.08em; }
.r9 .hud-bar { width:28px; height:1px; background:var(--gold); }
.r9 .hud-t { font-size:.72rem; font-weight:700; letter-spacing:.22em; text-transform:uppercase; }
@media(max-width:900px){ .r9 .hud { display:none; } }

/* ─── SCENES ─── */
.r9 .scene { position:relative; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:clamp(6rem,14vh,9rem) var(--pad); }
.r9 .scene-inner { width:100%; max-width:1200px; margin-inline:auto; text-align:center; }
.r9 .sc-paper .scene-inner, .r9 .sc-alt .scene-inner { text-align:left; }
.r9 .sc-paper .team-note, .r9 .sc-alt .team-note { margin-inline:0; }
.r9 .sc-ink { background:var(--ink); color:var(--paper); }
.r9 .sc-dark { background:var(--ink-800); color:var(--paper); }
.r9 .sc-paper { background:var(--paper); color:var(--ink); }
.r9 .sc-alt { background:var(--paper-alt); color:var(--ink); }

/* ─── HERO ─── */
.r9 .hero { position:relative; min-height:100svh; display:flex; align-items:flex-end; overflow:hidden; background:var(--ink); color:var(--paper); }
.r9 .hero-media { position:absolute; inset:0; }
.r9 .hero-scrim { position:absolute; inset:0; background:rgba(11,11,11,.68); z-index:1; }
.r9 .hero-inner { position:relative; z-index:2; width:100%; padding:9rem var(--pad) 7rem; }
.r9 .hero-label { color:var(--stone); margin-bottom:2rem; }
.r9 .hero-h { font-size:clamp(2.8rem,9.2vw,8.75rem); color:var(--paper); }
.r9 .hero-h .row { display:block; }
.r9 .hero-h .row-kick { font-size:.42em; margin-bottom:.35em; }
.r9 .hero-sub { display:flex; align-items:center; gap:1.25rem; margin-top:2.25rem; flex-wrap:wrap; }
.r9 .hero-tags { font-size:.72rem; font-weight:600; letter-spacing:.24em; text-transform:uppercase; color:var(--stone); }
.r9 .hero-cta { display:flex; gap:1rem; margin-top:2.5rem; flex-wrap:wrap; }
.r9 .hero-foot {
  position:absolute; bottom:0; left:0; right:0; z-index:2;
  display:flex; justify-content:space-between; align-items:center;
  padding:1.1rem var(--pad); border-top:1px solid var(--line-dark);
  font-size:.66rem; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:var(--stone);
}
.r9 .hero-foot .blink { animation:r9bob 2.4s ease-in-out infinite; display:inline-block; }
.r9 .hero-credit { color:var(--stone); }
@media(max-width:860px){ .r9 .hero-credit { display:none; } }
@keyframes r9bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }

/* word-stagger kinetic type */
.r9 .kin { display:inline; }
.r9 .kin .w { display:inline-block; overflow:hidden; vertical-align:bottom; }
.r9 .kin .wi { display:inline-block; will-change:transform; }

/* ─── TICKER ─── */
.r9 .ticker { overflow:hidden; background:var(--ink); border-top:1px solid var(--line-dark); border-bottom:1px solid var(--line-dark); }
.r9 .ticker-row { display:flex; align-items:center; width:max-content; padding:1rem 0; animation:r9tick 32s linear infinite; white-space:nowrap; }
.r9 .ticker-item { font-family:var(--dp); font-size:.78rem; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--stone); padding:0 1.6rem; }
.r9 .ticker-sq { width:5px; height:5px; background:var(--gold); flex:none; }
@keyframes r9tick { from{transform:translateX(0)} to{transform:translateX(-50%)} }

/* ─── IDENTITY BEATS ─── */
.r9 .ghost-n {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-52%);
  font-family:var(--dp); font-weight:800; font-size:clamp(15rem,40vw,30rem);
  line-height:1; color:transparent; -webkit-text-stroke:1.5px rgba(246,246,244,.07);
  pointer-events:none; user-select:none;
}
.r9 .stamp {
  width:clamp(76px,10vw,104px); height:clamp(76px,10vw,104px);
  border:1px solid var(--line-dark); margin:0 auto 2.75rem;
  display:flex; align-items:center; justify-content:center;
}
.r9 .stamp .glyph { margin:0; width:56%; height:56%; }
.r9 .beat-eyebrow { display:inline-block; border:1px solid var(--line-dark); padding:.45em .8em; font-size:.68rem; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:var(--stone); margin-bottom:2.5rem; }
.r9 .glyph { width:clamp(52px,8vw,80px); height:clamp(52px,8vw,80px); color:var(--gold); margin:0 auto 2.75rem; display:block; }
.r9 .statement { font-family:var(--dp); text-transform:uppercase; font-weight:800; letter-spacing:-.01em; line-height:1.04; font-size:clamp(2rem,6.2vw,4.75rem); color:var(--paper); max-width:20ch; margin-inline:auto; }
.r9 .statement .dim { color:var(--stone); }
.r9 .neither-w { position:relative; display:inline-block; }
.r9 .neither-line { position:absolute; left:-.06em; right:-.06em; top:52%; height:.085em; background:var(--gold); transform-origin:left center; }
.r9 .payoff { font-size:clamp(2.5rem,8.2vw,6.75rem); max-width:16ch; }
.r9 .payoff-tail { font-family:var(--tx); font-size:clamp(1rem,2vw,1.25rem); color:var(--stone); margin-top:2rem; text-transform:none; letter-spacing:0; font-weight:400; line-height:1.7; }
.r9 .scene-mark { width:clamp(96px,14vw,160px); height:auto; margin:0 auto 2.75rem; display:block; color:var(--paper); }

/* the ACT: one sticky stage, the gear lives through the whole chapter */
.r9 .act { position:relative; background:var(--ink); color:var(--paper); }
.r9 .act-stage {
  position:fixed; top:0; left:0; right:0; height:100vh;
  z-index:1; overflow:hidden; pointer-events:none;
}
.r9 .act-obj { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; will-change:transform,opacity; }
.r9 .act-obj img {
  width:min(940px,96vw); height:auto; display:block;
  -webkit-mask-image:radial-gradient(ellipse 66% 62% at 50% 50%, black 52%, transparent 78%);
  mask-image:radial-gradient(ellipse 66% 62% at 50% 50%, black 52%, transparent 78%);
}
@media(max-width:720px){ .r9 .act-obj img { width:135vw; } }
.r9 .act-caption {
  position:absolute; left:50%; bottom:2.1rem; transform:translateX(-50%);
  display:grid; place-items:center; white-space:nowrap;
}
.r9 .act-caption > span {
  grid-area:1/1; display:inline-flex; align-items:center; gap:.6rem;
  border:1px solid rgba(196,164,106,.5); background:rgba(11,11,11,.78); padding:.65rem 1.1rem;
  font-size:.68rem; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:var(--paper);
}
.r9 .act-caption .csq { width:5px; height:5px; background:var(--gold); flex:none; }
.r9 .act .scene { position:relative; z-index:2; background:transparent; min-height:118vh; }
.r9 .act .statement, .r9 .act .proof, .r9 .act .beat-eyebrow { position:relative; z-index:1; }

/* proof strips under identity beats */
.r9 .proof { display:flex; gap:1px; background:var(--ink); border:1px solid var(--line-dark); padding:5px; max-width:600px; margin:3rem auto 0; }
.r9 .proof-cell { position:relative; flex:1; aspect-ratio:16/10; overflow:hidden; background:var(--ink-800); }
.r9 .proof-cell img { width:100%; height:100%; object-fit:cover; object-position:top; filter:grayscale(.15) contrast(1.05); }
.r9 .proof-cap { display:block; text-align:center; font-size:.62rem; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:var(--ink-500); margin-top:1rem; }

/* ─── TWO PARTS (ledger) ─── */
.r9 .sec-head { font-family:var(--dp); text-transform:uppercase; font-size:clamp(2.2rem,6vw,4.75rem); font-weight:800; letter-spacing:-.01em; line-height:1.02; margin:1.25rem 0 0; }
.r9 .ledger { display:grid; grid-template-columns:1.08fr .92fr; gap:clamp(1.5rem,3vw,2.5rem); margin-top:3.5rem; text-align:left; align-items:start; }
.r9 .ledger-col { border:1px solid var(--line); background:var(--paper); padding:clamp(1.75rem,4vw,3rem); position:relative; }
.r9 .ledger-col:last-child { margin-top:clamp(2rem,6vw,4.5rem); background:var(--ink); color:var(--paper); border-color:var(--ink); }
.r9 .ledger-col:last-child .ledger-d { color:var(--stone); }
.r9 .ledger-col:last-child .ledger-list li { color:var(--paper); border-top-color:var(--line-dark); }
.r9 .ledger-col::after { content:''; position:absolute; top:0; right:0; width:clamp(2.5rem,5vw,4rem); height:4px; background:var(--gold); }
@media(max-width:720px){ .r9 .ledger { grid-template-columns:1fr; } .r9 .ledger-col:last-child { margin-top:0; } }
.r9 .ledger-n { font-family:var(--dp); font-size:.8rem; font-weight:800; letter-spacing:.1em; color:var(--gold-deep); margin-bottom:1.25rem; }
.r9 .ledger-t { font-family:var(--dp); text-transform:uppercase; font-size:clamp(1.5rem,3vw,2.25rem); font-weight:800; letter-spacing:-.01em; margin-bottom:.4rem; }
.r9 .ledger-d { font-size:.95rem; color:var(--ink-500); margin-bottom:1.75rem; }
.r9 .ledger-list { list-style:none; }
.r9 .ledger-list li { font-size:.98rem; color:var(--ink-700); padding:.85rem 0 .85rem 1.5rem; border-top:1px solid var(--line); position:relative; }
.r9 .ledger-list li::before { content:''; position:absolute; left:0; top:1.45rem; width:6px; height:6px; background:var(--gold); }

/* ─── BILLBOARD ─── */
.r9 .bill-q { font-family:var(--dp); text-transform:uppercase; font-size:clamp(2rem,6vw,4.6rem); font-weight:800; letter-spacing:-.01em; line-height:1.04; color:var(--paper); max-width:18ch; margin-inline:auto; }
.r9 .bill-body { font-size:clamp(1rem,1.9vw,1.2rem); color:var(--stone); line-height:1.8; max-width:58ch; margin:2.5rem auto 0; }
.r9 .bill-body em { color:var(--gold); font-style:normal; font-weight:600; }

/* ─── TEAM (stats strip) ─── */
.r9 .stats { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid var(--line); margin:3.5rem 0 2.5rem; text-align:left; }
.r9 .stat { position:relative; padding:clamp(1.75rem,3.5vw,2.75rem); border-right:1px solid var(--line); }
.r9 .stat::before { content:attr(data-i); position:absolute; top:1rem; right:1.25rem; font-family:var(--dp); font-size:.72rem; font-weight:800; letter-spacing:.1em; color:var(--gold-deep); }
.r9 .stat:last-child { border-right:none; }
@media(max-width:720px){ .r9 .stats { grid-template-columns:1fr; } .r9 .stat { border-right:none; border-bottom:1px solid var(--line); } .r9 .stat:last-child { border-bottom:none; } }
.r9 .stat-n { display:block; font-family:var(--dp); font-size:clamp(3rem,6.5vw,5.25rem); font-weight:800; letter-spacing:-.02em; line-height:1; }
.r9 .stat-l { display:block; font-size:.82rem; color:var(--ink-500); margin-top:.9rem; line-height:1.5; letter-spacing:.04em; text-transform:uppercase; font-weight:600; }
.r9 .team-note { font-size:1.05rem; color:var(--ink-500); max-width:62ch; line-height:1.8; margin-inline:auto; }

/* ─── BREATHER (light bloom curtain into The Work) ─── */
.r9 .bloom { position:relative; overflow:hidden; }
.r9 .bloom-light {
  position:absolute; left:50%; bottom:-42vh; transform:translateX(-50%);
  width:130vw; height:90vh; pointer-events:none;
  background:radial-gradient(ellipse at center, rgba(196,164,106,.34) 0%, rgba(196,164,106,.1) 38%, transparent 68%);
}
.r9 .bloom-wm {
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  font-family:var(--dp); text-transform:uppercase; font-weight:800; white-space:nowrap;
  font-size:clamp(3.4rem,16vw,15rem); letter-spacing:-.01em;
  color:transparent; -webkit-text-stroke:1px rgba(196,164,106,.22);
  pointer-events:none; user-select:none;
}
.r9 .bloom-copy { position:relative; z-index:1; }
.r9 .bloom-copy .idx { color:var(--stone); }
.r9 .bloom-head { font-family:var(--dp); text-transform:uppercase; font-weight:800; font-size:clamp(2rem,5vw,3.6rem); color:var(--paper); margin-top:1.2rem; }

/* ─── STORY PANELS ─── */
.r9 .story { display:grid; grid-template-columns:1.05fr 1fr; gap:clamp(2.5rem,6vw,5.5rem); align-items:center; width:100%; max-width:1200px; margin-inline:auto; text-align:left; }
.r9 .story.rev .story-media { order:2; }
@media(max-width:880px){ .r9 .story { grid-template-columns:1fr; gap:2.5rem; } .r9 .story.rev .story-media { order:0; } }
.r9 .story-media { position:relative; }
.r9 .frame { position:relative; border:1px solid var(--line); background:var(--ink); overflow:hidden; }
.r9 .frame-bar { display:flex; align-items:center; gap:.45rem; padding:.7rem 1rem; border-bottom:1px solid var(--line-dark); background:var(--ink-800); }
.r9 .frame-dot { width:7px; height:7px; border:1px solid var(--stone); }
.r9 .frame-url { margin-left:.6rem; font-size:.62rem; letter-spacing:.14em; text-transform:uppercase; color:var(--stone); font-weight:600; }
.r9 .frame-shot { position:relative; aspect-ratio:16/10; overflow:hidden; }
.r9 .frame-shot img { width:100%; height:100%; object-fit:cover; object-position:center; }
/* film slate plate */
.r9 .slate { position:relative; aspect-ratio:4/3; background:var(--ink); border:1px solid var(--line); padding:clamp(1.5rem,3vw,2.25rem); display:flex; flex-direction:column; color:var(--paper); }
.r9 .slate-row { display:flex; justify-content:space-between; align-items:center; font-size:.62rem; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:var(--stone); padding:.7rem 0; border-bottom:1px solid var(--line-dark); }
.r9 .slate-row:first-child { border-top:1px solid var(--line-dark); }
.r9 .slate-mid { flex:1; display:flex; flex-direction:column; justify-content:center; }
.r9 .slate-big { font-family:var(--dp); text-transform:uppercase; font-size:clamp(2rem,4.2vw,3.4rem); font-weight:800; letter-spacing:-.01em; line-height:1; }
.r9 .slate-big-label { font-size:.8rem; color:var(--stone); margin-top:.9rem; max-width:26ch; line-height:1.55; letter-spacing:.06em; text-transform:uppercase; font-weight:600; }
.r9 .slate-clap { position:absolute; top:0; left:0; right:0; height:10px; background:repeating-linear-gradient(-45deg, var(--gold) 0 14px, var(--ink) 14px 28px); }
.r9 .story-metric { display:flex; align-items:baseline; gap:1rem; margin-bottom:1.75rem; padding-bottom:1.5rem; border-bottom:1px solid var(--line); }
.r9 .story-metric-n { font-family:var(--dp); font-size:clamp(2.75rem,5vw,4rem); font-weight:800; letter-spacing:-.02em; line-height:1; color:var(--gold-deep); }
.r9 .story-metric-l { font-size:.72rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-500); max-width:22ch; line-height:1.5; }
.r9 .story-idx { display:flex; align-items:center; gap:.9rem; margin-bottom:1.5rem; }
.r9 .story-idx .bar { width:40px; height:1px; background:var(--gold); }
.r9 .story-client { font-family:var(--dp); text-transform:uppercase; font-size:clamp(1.9rem,4vw,3rem); font-weight:800; letter-spacing:-.01em; line-height:1; margin-bottom:1rem; }
.r9 .story-head { font-family:var(--tx); font-size:1.05rem; font-weight:700; color:var(--gold-deep); line-height:1.5; margin-bottom:1.1rem; }
.r9 .story-body { font-size:1.02rem; color:var(--ink-500); line-height:1.85; margin-bottom:1.5rem; }
.r9 .story-stat { display:inline-block; font-size:.78rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--ink); border:1px solid var(--line); border-left:4px solid var(--gold); padding:.8rem 1.1rem; }

/* ─── VOICES ─── */
.r9 .voices { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid var(--line); margin-top:3.5rem; text-align:left; }
.r9 .voice { padding:clamp(1.75rem,3vw,2.5rem); border-right:1px solid var(--line); border-top:3px solid var(--gold); display:flex; flex-direction:column; gap:1.75rem; background:var(--paper); }
.r9 .voice:last-child { border-right:none; }
@media(max-width:880px){ .r9 .voices { grid-template-columns:1fr; } .r9 .voice { border-right:none; border-bottom:1px solid var(--line); } .r9 .voice:last-child { border-bottom:none; } }
.r9 .voice-mark { display:block; width:10px; height:10px; background:var(--gold); }
.r9 .voice-q { font-size:.98rem; color:var(--ink-700); line-height:1.8; flex:1; }
.r9 .voice-m { display:inline-block; border:1px solid var(--gold-deep); padding:.4em .7em; font-size:.62rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--gold-deep); margin-bottom:.8rem; }
.r9 .voice-n b { display:block; font-size:.88rem; font-weight:700; color:var(--ink); }
.r9 .voice-n span { font-size:.8rem; color:var(--ink-500); }

/* ─── CTA ─── */
.r9 .cta { position:relative; overflow:hidden; }
.r9 .cta-wm { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:clamp(200px,42vw,440px); opacity:.05; pointer-events:none; color:var(--paper); }
.r9 .cta-head { font-family:var(--dp); text-transform:uppercase; font-size:clamp(2.4rem,7vw,5.5rem); font-weight:800; letter-spacing:-.01em; line-height:1; color:var(--paper); margin:1.5rem 0 1.75rem; }
.r9 .cta-body { font-size:1.05rem; color:var(--stone); line-height:1.8; max-width:46ch; margin:0 auto 2.75rem; }
.r9 .cta-row { display:flex; gap:1.5rem; align-items:center; justify-content:center; flex-wrap:wrap; }
.r9 .cta-note { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--stone); font-weight:600; }

/* brief form */
.r9 .brief { display:grid; grid-template-columns:1.15fr .85fr; border:1px solid var(--line-dark); border-top:3px solid var(--gold); text-align:left; max-width:900px; margin:3rem auto 0; background:var(--ink-800); }
@media(max-width:760px){ .r9 .brief { grid-template-columns:1fr; } }
.r9 .brief-form { padding:clamp(1.5rem,3vw,2.25rem); border-right:1px solid var(--line-dark); display:flex; flex-direction:column; gap:1.4rem; }
@media(max-width:760px){ .r9 .brief-form { border-right:none; border-bottom:1px solid var(--line-dark); } }
.r9 .brief-field { display:flex; flex-direction:column; gap:.45rem; }
.r9 .brief-field label { font-size:.62rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--stone); }
.r9 .brief-field input, .r9 .brief-field textarea {
  background:transparent; border:0; border-bottom:1px solid var(--line-dark);
  color:var(--paper); font-family:var(--tx); font-size:1.08rem; padding:.65rem 0;
  outline:none; resize:none; border-radius:0;
}
.r9 .brief-field input:focus, .r9 .brief-field textarea:focus { border-bottom-color:var(--gold); }
.r9 .brief-form .btn-gold { align-self:flex-start; margin-top:.35rem; }
@media(max-width:760px){ .r9 .brief-form .btn-gold { align-self:stretch; text-align:center; } }
.r9 .brief-side { padding:clamp(1.5rem,3vw,2.25rem); display:flex; flex-direction:column; gap:1.4rem; justify-content:center; }
.r9 .brief-side .k { font-size:.62rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--stone); display:block; margin-bottom:.3rem; }
.r9 .brief-side a { color:var(--paper); font-size:.98rem; transition:color .15s; }
.r9 .brief-side a:hover { color:var(--gold); }
.r9 .brief-note { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--stone); font-weight:600; }

/* ─── PORTFOLIO WALL ─── */
.r9 .work { padding:clamp(5rem,10vw,9rem) var(--pad); background:var(--paper); }
.r9 .work-inner { max-width:1280px; margin-inline:auto; }
.r9 .work-head-row { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:1rem; }
.r9 .work-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--line); border:1px solid var(--line); margin-top:2.75rem; }
@media(max-width:1000px){ .r9 .work-grid { grid-template-columns:repeat(2,1fr); } }
@media(max-width:560px){ .r9 .work-grid { grid-template-columns:1fr; } }
.r9 .vcard { position:relative; aspect-ratio:16/9; overflow:hidden; cursor:pointer; background:var(--ink-800); }
.r9 .vcard-v { aspect-ratio:9/16; }
.r9 .vposter { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .6s cubic-bezier(.22,1,.36,1); }
.r9 .vcard:hover .vposter { transform:scale(1.045); }
.r9 .reels-head { display:flex; align-items:center; gap:1rem; margin:2.75rem 0 1.25rem; }
.r9 .reels-head .bar { flex:1; height:1px; background:var(--line); }
.r9 .reels-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--line); border:1px solid var(--line); }
@media(max-width:1000px){ .r9 .reels-grid { grid-template-columns:repeat(2,1fr); } }
.r9 .vcthumb { position:absolute; inset:0; }
.r9 .vshade { position:absolute; inset:0; background:rgba(11,11,11,.32); z-index:1; transition:background .25s; }
.r9 .vcard:hover .vshade { background:rgba(11,11,11,.05); }
.r9 .vcap { position:absolute; bottom:0; left:0; right:0; padding:.8rem 1rem; z-index:2; display:flex; justify-content:space-between; align-items:baseline; gap:.5rem; background:rgba(11,11,11,.55); }
.r9 .vcap .nm { font-family:var(--dp); text-transform:uppercase; font-size:.72rem; font-weight:700; letter-spacing:.06em; color:#fff; }
.r9 .vcap .tg { font-size:.6rem; letter-spacing:.16em; text-transform:uppercase; color:var(--stone); font-weight:600; }
.r9 .vpl { position:absolute; top:1rem; right:1rem; z-index:2; font-size:.6rem; letter-spacing:.18em; text-transform:uppercase; color:#fff; border:1px solid rgba(255,255,255,.4); padding:.4rem .7rem; opacity:0; transition:opacity .2s; }
.r9 .vcard:hover .vpl { opacity:1; }
@media(hover:none){ .r9 .vpl { opacity:1; } }

/* ─── FOOTER ─── */
.r9 .foot { padding:3.5rem var(--pad) 2.5rem; background:var(--ink); color:var(--paper); border-top:1px solid var(--line-dark); }
.r9 .foot-inner { max-width:1280px; margin-inline:auto; }
.r9 .foot-wm { font-size:clamp(1.7rem,8.4vw,7rem); color:transparent; -webkit-text-stroke:1px rgba(246,246,244,.16); white-space:nowrap; margin-bottom:3rem; }
.r9 .foot-top { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:2rem; margin-bottom:2.75rem; }
.r9 .foot-brand { display:flex; align-items:center; gap:.7rem; color:var(--stone); }
.r9 .foot-mark { width:24px; height:24px; color:var(--paper); }
.r9 .foot-links { display:flex; flex-wrap:wrap; gap:1.75rem; }
.r9 .foot-links a { font-size:.7rem; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--stone); transition:color .15s; }
.r9 .foot-links a:hover { color:var(--paper); }
.r9 .foot-base { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding-top:2rem; border-top:1px solid var(--line-dark); }
.r9 .foot-sig { font-family:var(--dp); text-transform:uppercase; font-size:.8rem; font-weight:800; letter-spacing:.04em; color:var(--stone); }
.r9 .foot-copy { font-size:.7rem; color:var(--ink-500); }

/* ─── MODAL ─── */
.r9 .modal { position:fixed; inset:0; z-index:900; background:rgba(11,11,11,.92); display:flex; align-items:center; justify-content:center; padding:1rem; }
.r9 .modal-box { width:100%; max-width:960px; background:var(--ink-800); border:1px solid var(--line-dark); }
.r9 .modal-box.portrait { max-width:min(400px, 92vw); }
.r9 .modal-head { display:flex; align-items:center; justify-content:space-between; padding:.9rem 1.25rem; border-bottom:1px solid var(--line-dark); }
.r9 .modal-head span { font-family:var(--dp); text-transform:uppercase; font-size:.78rem; font-weight:700; letter-spacing:.06em; color:var(--paper); }
.r9 .modal-head button { font-size:1.5rem; line-height:1; color:var(--stone); width:32px; height:32px; display:flex; align-items:center; justify-content:center; transition:color .15s; }
.r9 .modal-head button:hover { color:var(--paper); }
.r9 .modal-vid { position:relative; aspect-ratio:16/9; }
.r9 .modal-box.portrait .modal-vid { aspect-ratio:9/16; max-height:80vh; margin-inline:auto; }
.r9 .modal-vid iframe { position:absolute; inset:0; width:100%; height:100%; border:none; }

@media(prefers-reduced-motion: reduce){
  .r9 .ticker-row, .r9 .hero-foot .blink { animation:none; }
}
`;

// ─── MOTION PRIMITIVES ────────────────────────────────────────────────────────

const EASE = [0.22, 1, 0.36, 1];

/** Word-by-word kinetic reveal. Pass an array of segments: {t, cls}.
 *  The in-view trigger lives on the PARENT — the clipped word spans are 0%-visible
 *  by definition (overflow:hidden + translate), so observing them would deadlock. */
function Kinetic({ segments, className = '', delay = 0, sq = false, ...rest }) {
  let wi = 0;
  const total = segments.reduce((n, seg) => n + seg.t.split(' ').filter(Boolean).length, 0);
  return (
    <motion.span
      className={'kin ' + className}
      initial="hide"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      {...rest}
    >
      {segments.map((seg, si) =>
        seg.t.split(' ').map((word, i, arr) => {
          if (!word) return null;
          const d = delay + wi++ * 0.05;
          return (
            <span className="w" key={si + '-' + i}>
              <motion.span
                className={'wi ' + (seg.cls || '')}
                variants={{ hide: { y: '110%' }, show: { y: 0, transition: { duration: 0.7, ease: EASE, delay: d } } }}
              >
                {word}
                {sq && wi === total ? <span className="sq" /> : null}
                {i < arr.length - 1 ? '\u00A0' : ''}
              </motion.span>
            </span>
          );
        })
      )}
    </motion.span>
  );
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

/** Simple fade/rise reveal */
function Rise({ children, delay = 0, y = 36, className = '', ...rest }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.85, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
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

/** Scroll parallax on a media block */
function Parallax({ children, amount = 40, className = '' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

// ─── GLYPHS ───────────────────────────────────────────────────────────────────

const GlyphFilm = () => (
  <svg viewBox="0 0 64 64" className="glyph" aria-hidden="true">
    <rect x="7" y="14" width="50" height="36" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="16" y1="14" x2="16" y2="50" stroke="currentColor" strokeWidth="2" />
    <line x1="48" y1="14" x2="48" y2="50" stroke="currentColor" strokeWidth="2" />
    <path d="M28 26 L40 32 L28 38 Z" fill="currentColor" />
  </svg>
);
const GlyphWeb = () => (
  <svg viewBox="0 0 64 64" className="glyph" aria-hidden="true">
    <rect x="7" y="12" width="50" height="40" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="7" y1="22" x2="57" y2="22" stroke="currentColor" strokeWidth="2" />
    <rect x="12" y="16" width="3" height="3" fill="currentColor" /><rect x="18" y="16" width="3" height="3" fill="currentColor" />
    <path d="M24 41 l-7 -6 l7 -6 M40 41 l7 -6 l-7 -6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
  </svg>
);
const GlyphBillboard = () => (
  <svg viewBox="0 0 64 64" className="glyph" aria-hidden="true">
    <rect x="7" y="11" width="50" height="29" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="20" y1="40" x2="20" y2="55" stroke="currentColor" strokeWidth="2" />
    <line x1="44" y1="40" x2="44" y2="55" stroke="currentColor" strokeWidth="2" />
    <rect x="14" y="18" width="24" height="4" fill="currentColor" />
    <rect x="14" y="26" width="14" height="4" fill="currentColor" opacity=".5" />
  </svg>
);

// ─── SCENE WRAPPER (registers with chapter HUD) ──────────────────────────────

function Scene({ ch, tone = 'sc-ink', className = '', children, id, style }) {
  const dark = tone === 'sc-ink' || tone === 'sc-dark';
  return (
    <section id={id} data-ch={ch} className={`scene ${tone} ${dark ? 'on-dark' : 'on-light'} ${className}`} style={style}>
      {children}
    </section>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function HomeR5Preview() {
  const [video, setVideo] = useState(null);
  const [prog, setProg] = useState(0);
  const [ch, setCh] = useState(0);
  const [brief, setBrief] = useState({ name: '', co: '', msg: '' });
  const heroRef = useRef(null);
  const { scrollYProgress: heroProg } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(heroProg, [0, 1], ['0%', '18%']);
  const heroScale = useTransform(heroProg, [0, 1], [1, 1.08]);

  // the ACT — one object choreography across the four identity beats
  const actRef = useRef(null);
  const { scrollYProgress: actP } = useScroll({ target: actRef, offset: ['start start', 'end end'] });
  const roninO = useTransform(actP, [0, 0.02, 0.2, 0.3, 0.52, 0.6, 0.72, 0.8], [0.9, 1, 1, 0, 0, 0.55, 0.55, 0]);
  const roninX = useTransform(actP, [0, 0.3, 0.52, 0.62], ['0vw', '-52vw', '-52vw', '-24vw']);
  const roninY = useTransform(actP, [0, 0.3], ['2vh', '10vh']);
  const roninS = useTransform(actP, [0, 0.3, 0.6, 0.8], [1.04, 0.7, 0.42, 0.38]);
  const roninR = useTransform(actP, [0, 0.3, 0.6], [-2, -9, -4]);
  const lapO = useTransform(actP, [0.26, 0.34, 0.52, 0.6, 0.72, 0.8], [0, 1, 1, 0.55, 0.55, 0]);
  const lapX = useTransform(actP, [0.26, 0.4, 0.52, 0.62], ['46vw', '0vw', '0vw', '24vw']);
  const lapS = useTransform(actP, [0.26, 0.45, 0.62, 0.8], [0.92, 1, 0.46, 0.4]);
  const lapR = useTransform(actP, [0.26, 0.45, 0.62], [7, 2, 5]);
  const stageO = useTransform(actP, [0, 0.005, 0.96, 1], [0, 1, 1, 0]);
  const cap1O = useTransform(actP, [0.02, 0.07, 0.2, 0.27], [0, 1, 1, 0]);
  const cap2O = useTransform(actP, [0.3, 0.37, 0.48, 0.55], [0, 1, 1, 0]);
  const cap3O = useTransform(actP, [0.58, 0.64, 0.7, 0.76], [0, 1, 1, 0]);

  const sendBrief = e => {
    e.preventDefault();
 const subject = `New project, ${brief.name}${brief.co ? ' (' + brief.co + ')' : ''}`;
 const body = `Hi AOM,%0D%0A%0D%0A${encodeURIComponent(brief.msg)}%0D%0A%0D%0A, ${encodeURIComponent(brief.name)}${brief.co ? '·' + encodeURIComponent(brief.co) : ''}`;
    window.location.href = `mailto:hello@aheadofmarket.com?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  // scroll progress + lenis
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
      if (lenis) lenis.scrollTo(el, { offset: -64, duration: 1.4 });
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
    const els = Array.from(document.querySelectorAll('.r9 [data-ch]'));
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
      <div className="r9">
        <style>{CSS}</style>
        <div className="rail" style={{ width: prog + '%' }} />

        {/* chapter HUD */}
        <div className="hud" aria-hidden="true">
          <span className="hud-n">{String(ch).padStart(2, '0')}</span>
          <span className="hud-bar" />
          <span className="hud-t">{CHAPTERS[ch]}</span>
        </div>

        {/* NAV */}
        <nav className="nav">
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

        {/* CH 00 — THE HOOK */}
        <header className="hero on-dark" data-ch="0" ref={heroRef}>
          <motion.div className="hero-media" style={{ y: heroY, scale: heroScale }}>
            <LazyGumlet id={HERO_REEL} eager filter="grayscale(0.92) contrast(1.32) brightness(.62)" />
          </motion.div>
          <div className="hero-scrim" />
          <div className="hero-inner">
            <motion.div
              className="hero-label"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
            >
 <span className="boxed">Phoenix, AZ, Since 2020</span>
            </motion.div>
            <h1 className="hero-h dp">
              <span className="row row-kick">
                <Kinetic delay={0.3} sq segments={[{ t: "Hi. We're Ahead of Market" }]} />
              </span>
              <span className="row gold">
                <Kinetic delay={0.65} segments={[{ t: 'We make companies' }]} />
              </span>
              <span className="row gold">
                <Kinetic delay={0.95} sq segments={[{ t: 'impossible to ignore' }]} />
              </span>
            </h1>
            <motion.div
              className="hero-sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.5 }}
            >
              <span className="hero-tags">Story · Film · Web · Ads</span>
            </motion.div>
            <motion.div
              className="hero-cta"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 1.65 }}
            >
              <a className="btn-gold" href="#contact">Start a conversation</a>
              <a className="btn-ghost" href="#work">See our work</a>
            </motion.div>
          </div>
          <div className="hero-foot">
 <span>00, The hook</span>
 <span className="hero-credit">Now playing: Journey to Gary Vee, our documentary work</span>
            <span className="blink">Scroll to meet us ↓</span>
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

        {/* CH 01 — WHO WE ARE: one act, the gear lives through it */}
        <div className="act" ref={actRef} id="story">
          <motion.div className="act-stage" aria-hidden="true" style={{ opacity: stageO }}>
            <motion.div className="act-obj" style={{ opacity: roninO, x: roninX, y: roninY, scale: roninS, rotate: roninR }}>
              <img src="/gear/ronin-4d.jpg" alt="" />
            </motion.div>
            <motion.div className="act-obj" style={{ opacity: lapO, x: lapX, scale: lapS, rotate: lapR }}>
              <img src="/gear/laptop.jpg" alt="" />
            </motion.div>
            <div className="act-caption">
              <motion.span style={{ opacity: cap1O }}><i className="csq" />The rig we shoot with</motion.span>
              <motion.span style={{ opacity: cap2O }}><i className="csq" />The machine we build on</motion.span>
              <motion.span style={{ opacity: cap3O }}><i className="csq" />Both true. Neither the point.</motion.span>
            </div>
          </motion.div>

        <Scene ch={1} tone="sc-ink">
          <div className="scene-inner">
 <Rise><span className="beat-eyebrow">So, who are we, exactly?</span></Rise>
            <p className="statement">
              <Kinetic sq segments={[{ t: 'Many companies around Phoenix know us as a ', cls: 'dim' }, { t: 'video company' }]} />
            </p>
            <Rise delay={0.35}>
              <div className="proof">
 <span className="proof-cell"><img src={poster('698a6296fc23d3d76fa8d992', 480)} alt="Journey to Gary Vee, film still" loading="lazy" /></span>
 <span className="proof-cell"><img src={poster('698a5ef5fc23d3d76fa87ef4', 480)} alt="Virtu Hospitality, film still" loading="lazy" /></span>
 <span className="proof-cell"><img src={poster('698a5fcdfc23d3d76fa893b8', 480)} alt="United Food Bank, film still" loading="lazy" /></span>
              </div>
              <span className="proof-cap">Frames from our films</span>
            </Rise>
          </div>
        </Scene>

        <Scene ch={1} tone="sc-ink">
          <div className="scene-inner">
            <p className="statement">
              <Kinetic sq segments={[{ t: 'Others know us as a ', cls: 'dim' }, { t: 'web development company' }]} />
            </p>
            <Rise delay={0.35}>
              <div className="proof">
 <span className="proof-cell"><img src="/hero-sites/ambition.jpg" alt="Ambition Mechanical, site by AOM" loading="lazy" /></span>
 <span className="proof-cell"><img src="/hero-sites/space-rising.jpg" alt="Space Rising, site by AOM" loading="lazy" /></span>
 <span className="proof-cell"><img src="/hero-sites/valor.jpg" alt="Valor to Victory, site by AOM" loading="lazy" /></span>
              </div>
              <span className="proof-cap">Sites we've built</span>
            </Rise>
          </div>
        </Scene>

        <Scene ch={1} tone="sc-dark">
          <div className="scene-inner">
            <p className="statement">
              <Kinetic segments={[{ t: "We're actually", cls: 'dim' }]} />
              {'\u00A0'}
              <span className="neither-w">
                <Kinetic segments={[{ t: 'neither' }]} />
                <motion.span
                  className="neither-line"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.4 }}
                />
              </span>
              {'\u00A0'}
              <Kinetic sq segments={[{ t: 'of those things', cls: 'dim' }]} />
            </p>
          </div>
        </Scene>

        <Scene ch={1} tone="sc-ink">
          <div className="scene-inner">
            <Rise><span className="beat-eyebrow">What we actually are</span></Rise>
            <Rise delay={0.1}><BrandMark kind="mono" className="scene-mark" /></Rise>
            <p className="statement payoff">
              <Kinetic sq segments={[{ t: "We're a ", cls: 'dim' }, { t: 'storytelling company', cls: 'gold' }]} />
            </p>
            <Rise delay={0.9}>
 <p className="payoff-tail">, we just happen to make videos and web apps often.</p>
            </Rise>
          </div>
        </Scene>
        </div>

        {/* CH 02 — WHAT WE DO */}
        <Scene ch={2} tone="sc-paper">
          <div className="scene-inner">
            <Rise><span className="boxed">What we actually do</span></Rise>
            <h2 className="sec-head">
              <Kinetic sq segments={[{ t: 'Everything we make falls into ' }, { t: 'two parts', cls: 'gold' }]} />
            </h2>
            <div className="ledger">
              <Rise className="ledger-col" delay={0.1}>
                <div className="ledger-n">01</div>
                <h3 className="ledger-t">Marketing</h3>
                <p className="ledger-d">The materials your message stands on.</p>
                <ul className="ledger-list">
                  <li>Websites &amp; web applications</li>
                  <li>Brand films &amp; video series</li>
                  <li>Quizzes &amp; interactive tools for prospects</li>
                  <li>Photography &amp; creative assets</li>
                </ul>
              </Rise>
              <Rise className="ledger-col" delay={0.25}>
                <div className="ledger-n">02</div>
                <h3 className="ledger-t">Promotion</h3>
                <p className="ledger-d">How it gets out into the world.</p>
                <ul className="ledger-list">
                  <li>Google &amp; Meta ad campaigns</li>
                  <li>Influencer posts &amp; partnerships</li>
                  <li>Email &amp; text-message campaigns</li>
                  <li>SEO &amp; content distribution</li>
                </ul>
              </Rise>
            </div>
          </div>
        </Scene>

        {/* CH 03 — THE BILLBOARD */}
        <Scene ch={3} tone="sc-ink">
          <div className="scene-inner">
            <Rise><span className="beat-eyebrow">The billboard test</span></Rise>
            <Rise delay={0.1}><span className="stamp"><GlyphBillboard /></span></Rise>
            <p className="bill-q">
              <Kinetic segments={[{ t: '"A billboard does no good in your ' }, { t: 'basement', cls: 'gold' }, { t: '."' }]} />
            </p>
            <Rise delay={0.5}>
              <p className="bill-body">
 A website or a video is the same, it doesn't help if you don't have a strategy to get it out.
                That's where we come in. We make the marketing materials, but <em>first</em> we figure out exactly how they'll get distributed most effectively.
              </p>
            </Rise>
          </div>
        </Scene>

        {/* CH 04 — THE TEAM */}
        <Scene ch={4} tone="sc-alt">
          <div className="scene-inner">
            <Rise><span className="boxed">Who we are</span></Rise>
            <h2 className="sec-head">
              <Kinetic sq segments={[{ t: 'A small team that has ' }, { t: 'done a lot', cls: 'gold' }]} />
            </h2>
            <div className="stats">
              <Rise className="stat" data-i="01" delay={0.05}>
                <span className="stat-n"><Counter value="100+" /></span>
                <span className="stat-l">Projects shipped since 2020</span>
              </Rise>
              <Rise className="stat" data-i="02" delay={0.15}>
                <span className="stat-n"><Counter value="3" /></span>
 <span className="stat-l">Industries, Tech, Construction, Nonprofits</span>
              </Rise>
              <Rise className="stat" data-i="03" delay={0.25}>
                <span className="stat-n"><Counter value="8+" /></span>
                <span className="stat-l">Years in commercial film, news &amp; media</span>
              </Rise>
            </div>
            <Rise delay={0.2}>
              <p className="team-note">
                Our team comes from commercial film production, local news, national media, and creative agencies.
 We've worked across Phoenix, nationally, and internationally, always story-first.
              </p>
            </Rise>
          </div>
        </Scene>

        {/* CH 05 — BREATHER: curtain into the work */}
        <Scene ch={5} tone="sc-ink" className="bloom">
          <span className="bloom-wm" aria-hidden="true">Ahead of Market</span>
          <div className="bloom-light" aria-hidden="true" />
          <div className="scene-inner bloom-copy">
            <Rise>
 <span className="idx">Enough about us, here's what that looks like</span>
              <div className="bloom-head">
                <Kinetic sq segments={[{ t: 'Now, the ' }, { t: 'work', cls: 'gold' }]} />
              </div>
            </Rise>
          </div>
        </Scene>

        {/* CH 05 — THE WORK (four story panels) */}
        {STORIES.map((s, i) => (
          <Scene ch={5} tone={i % 2 ? 'sc-alt' : 'sc-paper'} key={s.client}>
            <div className={'story' + (i % 2 ? ' rev' : '')}>
              <div className="story-media">
                <Parallax amount={34}>
                  <Rise>
                    {s.media === 'site' ? (
                      <div className="frame">
                        <div className="frame-bar">
                          <span className="frame-dot" /><span className="frame-dot" /><span className="frame-dot" />
                          <span className="frame-url">{s.client}</span>
                        </div>
                        <div className="frame-shot">
 <img src={s.src} alt={`${s.client}, website by Ahead of Market`} loading="lazy" />
                        </div>
                      </div>
                    ) : (
                      <div className="slate">
                        <div className="slate-clap" />
                        <div className="slate-row"><span>Production</span><span>{s.slate.title}</span></div>
                        <div className="slate-mid">
                          <span className="slate-big">{s.slate.roll}<span className="sq" /></span>
                        </div>
                        <div className="slate-row"><span>Scene</span><span>{s.slate.scene}</span></div>
                        <div className="slate-row"><span>Take</span><span>{s.slate.take}</span></div>
                      </div>
                    )}
                  </Rise>
                </Parallax>
              </div>
              <Rise delay={0.15} className="story-copy">
                <div className="story-metric">
                  <span className="story-metric-n"><Counter value={s.big} /></span>
                  <span className="story-metric-l">{s.bigLabel}</span>
                </div>
                <div className="story-idx">
 <span className="idx">{i === 0 ? 'Some recent work, ' : ''}{String(i + 1).padStart(2, '0')} / {String(STORIES.length).padStart(2, '0')}</span>
                  <span className="bar" />
                  <span className="idx">{s.tag}</span>
                </div>
                <h3 className="story-client"><SqText text={s.client} /></h3>
                <p className="story-head">{s.headline}</p>
                <p className="story-body">{s.body}</p>
                <span className="story-stat">{s.stat}</span>
              </Rise>
            </div>
          </Scene>
        ))}

        {/* CH 06 — VOICES */}
        <Scene ch={6} tone="sc-paper">
          <div className="scene-inner">
            <Rise><span className="boxed">Voices</span></Rise>
            <h2 className="sec-head">
              <Kinetic sq segments={[{ t: 'What clients ' }, { t: 'say', cls: 'gold' }]} />
            </h2>
            <div className="voices">
              {VOICES.map((v, i) => (
                <Rise key={v.n} delay={i * 0.12} className="voice">
                  <span className="voice-mark" aria-hidden="true" />
                  <p className="voice-q">{v.q}</p>
                  <div>
                    <div className="voice-m">{v.m}</div>
                    <div className="voice-n">
                      <b>{v.n}</b>
                      <span>{v.c}</span>
                    </div>
                  </div>
                </Rise>
              ))}
            </div>
          </div>
        </Scene>

        {/* CH 07 — THE CONVERSATION */}
        <Scene ch={7} tone="sc-ink" id="contact" className="cta">
          <BrandMark kind="mono" className="cta-wm" />
          <div className="scene-inner" style={{ position: 'relative', zIndex: 1 }}>
            <Rise><span className="boxed" style={{ color: 'var(--gold)' }}>Ready when you are</span></Rise>
            <h2 className="cta-head">
              <Kinetic sq segments={[{ t: 'It all starts with a ' }, { t: 'conversation', cls: 'gold' }]} />
            </h2>
            <Rise delay={0.4}>
              <p className="cta-body">
 By now you know us a little. We'd love to learn about what you're working on, and how we might be able to help.
              </p>
            </Rise>
            <Rise delay={0.55}>
              <form className="brief" onSubmit={sendBrief}>
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
            </Rise>
          </div>
        </Scene>

        {/* CLOSING REEL — PORTFOLIO */}
        <section className="work on-light" id="work" data-ch="7">
          <div className="work-inner">
            <Rise>
              <div className="work-head-row">
                <div>
                  <span className="boxed">Our work</span>
                  <h2 className="sec-head">
                    100+ projects.<br /><SqText text="Here are a few" />
                  </h2>
                </div>
                <span className="idx">Tap any film to play</span>
              </div>
            </Rise>
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
                  <span className="vpl">Play</span>
                  <div className="vcap">
                    <span className="nm">{p.t}</span>
                    <span className="tg">{p.tag}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <Rise className="reels-head">
 <span className="idx">Reels, made for the feed</span>
              <span className="bar" />
            </Rise>
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
                  <span className="vpl">Play</span>
                  <div className="vcap">
                    <span className="nm">{p.t}</span>
                    <span className="tg">{p.tag}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="foot on-dark">
          <div className="foot-inner">
            <Rise>
              <div className="foot-wm dp" aria-hidden="true">Ahead of Market<span className="sq" /></div>
            </Rise>
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
            <div className={'modal-box' + (video.v ? ' portrait' : '')}>
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