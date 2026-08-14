import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, MotionConfig } from 'framer-motion';
import LazyGumlet from '../components/home/LazyGumlet';
import BrandMark from '../components/home/BrandMark';

// Mounted at /taste for review (route moved off /r6 — a parallel R17 concept staked
// public/r6/). Mission: aheadofmarket.com:home (R17-taste).
// "Taste pattern" — tastelabs.com's structural language (alternating obsidian/ivory
// panels, mono micro-labels, two-tone dim/bright display type, a centered hero stage,
// grouped list-rows, a playful light gallery, mono-column footer) rebuilt with our
// content: Patrik's narrative verbatim from /r5, our real client footage as the
// centerpiece, gold square period on every headline, ghost wordmark. No borrowed copy,
// no borrowed assets — the pattern is the reference, the substance is AOM.

const TICKER = ["Skylar", "PA'LA", 'Ambition Mechanical', 'ISA Energy', 'Brandon Wiley', 'Space Rising', 'Included Health', 'Intelliplay', 'Valor to Victory', 'Kohrs'];

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

const RECORD = [
  {
    group: 'Film',
    rows: [
      { t: 'ISA Energy', meta: ['Three-film series', 'Live in investor meetings'] },
      { t: 'Included Health', meta: ['Film series', 'Screened at Inspire Summit'] },
      { t: 'Journey to Gary Vee', meta: ['Documentary', 'Our flagship doc work'] },
      { t: 'Virtu Hospitality', meta: ['Brand film', 'Story on screen'] },
    ],
  },
  {
    group: 'Web & platforms',
    rows: [
      { t: 'Space Rising', meta: ['SpaceOS platform', '1,000+ in one room at Space Congress'] },
      { t: 'Ambition Mechanical', meta: ['Website + Google Ads', '4 organic leads a month'] },
      { t: 'Valor to Victory', meta: ['Website', 'Nonprofit'] },
    ],
  },
  {
    group: 'Campaigns & content',
    rows: [
      { t: "PA'LA x HARUMI", meta: ['Brand content', 'Phoenix'] },
      { t: 'Kohrs', meta: ['Content engine', 'Ongoing'] },
      { t: 'United Food Bank', meta: ['Campaign film', 'Nonprofit'] },
    ],
  },
];

const VOICES = [
  { q: 'The video was a huge tool in recruiting our first 3 cohorts. Every sponsor meeting we played it. It did the selling for us.', n: 'Brandon Clarke', c: 'Startup AZ Foundation', m: '3 cohorts recruited' },
 { q: 'Before AOM we posted randomly. Now we have a repeatable system, the content actually brings people in.', n: 'Sumit Seth', c: 'Naamly SaaS', m: 'Repeatable content engine' },
  { q: 'They did not just shoot beautiful footage. They understood who we are and made sure every frame said it.', n: 'Gio Osso', c: 'Virtu Hospitality Group', m: 'Brand story on screen' },
];

const HERO_REEL = '698a6296fc23d3d76fa8d992'; // Journey to Gary Vee, strongest horizontal doc footage

const embed = id => `https://play.gumlet.io/embed/${id}?autoplay=true&preload=false&loop=false&background=false&disable_player_controls=false`;
const poster = (id, w = 800) => `https://video.gumlet.io/697678222b8b17fbb707acef/${id}/thumbnail-1-0.png?format=auto&w=${w}`;

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
.r17 {
  --ink:#0A0A09; --ink-2:#121211; --paper:#F2F0EA; --paper-2:#EAE7DF;
  --mut:rgba(242,240,234,.6); --dim:rgba(242,240,234,.34);
  --ink-mut:rgba(10,10,9,.62); --ink-dim:rgba(10,10,9,.4);
  --line:rgba(255,255,255,.12); --line-ink:rgba(10,10,9,.14);
  --gold:#C4A46A; --gold-deep:#A8884C;
  --fx:'Inter',system-ui,Helvetica,Arial,sans-serif;
  --mono:'JetBrains Mono','Space Mono',ui-monospace,monospace;
  --pad:clamp(1.5rem,4.5vw,4rem);
  font-family:var(--fx); color:var(--paper); background:var(--ink);
  font-size:16px; line-height:1.6;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
}
.r17 *, .r17 *::before, .r17 *::after { box-sizing:border-box; margin:0; padding:0; }
.r17 a { color:inherit; text-decoration:none; }
.r17 button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.r17 img { display:block; max-width:100%; }
.r17 a:focus-visible, .r17 button:focus-visible, .r17 input:focus-visible, .r17 textarea:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* the signature: square gold period */
.r17 .sq { display:inline-block; width:.12em; height:.12em; background:var(--gold); margin-left:.08em; }

/* mono micro-label */
.r17 .mlb { font-family:var(--mono); font-size:.66rem; font-weight:500; letter-spacing:.22em; text-transform:uppercase; color:var(--dim); }
.r17 .lt .mlb { color:var(--ink-dim); }

/* display type — sentence case, tight; two-tone via .hi/.lo */
.r17 .dp { font-weight:400; letter-spacing:-.035em; line-height:1.1; }
.r17 .lo { color:var(--dim); }
.r17 .lt .lo { color:var(--ink-dim); }

/* ─── NAV — solid bar, centered brand, mono links ─── */
.r17 .nav {
  position:fixed; top:0; left:0; right:0; z-index:200;
  display:grid; grid-template-columns:1fr auto 1fr; align-items:center;
  padding:1rem var(--pad); background:rgba(10,10,9,.82);
  backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
  border-bottom:1px solid var(--line);
}
.r17 .nav-links { display:flex; gap:2.25rem; font-family:var(--mono); font-size:.74rem; letter-spacing:.08em; }
.r17 .nav-links a { color:var(--mut); transition:color .15s; }
.r17 .nav-links a:hover { color:var(--paper); }
.r17 .nav-brand { display:flex; align-items:center; gap:.6rem; justify-self:center; }
.r17 .nav-mark { width:22px; height:22px; color:var(--paper); }
.r17 .nav-name { font-size:.92rem; font-weight:500; letter-spacing:-.01em; white-space:nowrap; }
.r17 .nav-cta { justify-self:end; font-size:.8rem; font-weight:500; padding:.6rem 1.4rem; border:1px solid rgba(242,240,234,.4); border-radius:99px; transition:background .18s, color .18s, border-color .18s; white-space:nowrap; }
.r17 .nav-cta:hover { background:var(--paper); color:var(--ink); border-color:var(--paper); }
@media(max-width:820px){ .r17 .nav-links { display:none; } .r17 .nav { grid-template-columns:auto 1fr auto; } .r17 .nav-brand { justify-self:start; } }

/* ─── HERO — centered stage, bottom-anchored two-tone headline ─── */
.r17 .hero { min-height:100svh; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding:5.5rem var(--pad) 3rem; position:relative; overflow:hidden; }
.r17 .hero-stage { width:min(1080px,100%); border-radius:18px; overflow:hidden; position:relative; aspect-ratio:16/9; max-height:56vh; box-shadow:0 30px 80px rgba(0,0,0,.5); }
.r17 .hero-stage::after { content:''; position:absolute; inset:0; border-radius:inherit; box-shadow:inset 0 0 0 1px rgba(255,255,255,.1); pointer-events:none; }
.r17 .hero-note { display:flex; justify-content:space-between; width:min(1080px,100%); margin-top:.9rem; font-family:var(--mono); font-size:.62rem; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); }
@media(max-width:640px){ .r17 .hero-note span:last-child { display:none; } }
@media(max-width:820px){
  /* fill the phone viewport — the film IS the centerpiece, don't let it shrink to a strip */
  .r17 .hero { justify-content:center; gap:0; }
  .r17 .hero-stage { aspect-ratio:3/4; max-height:54vh; }
}
.r17 .hero-h { text-align:center; font-size:clamp(2.1rem,4.6vw,3.9rem); margin-top:clamp(2rem,5vh,3.5rem); }
.r17 .hero-h .row { display:block; }
.r17 .hero-link { display:inline-flex; align-items:center; gap:.8rem; margin-top:1.9rem; font-family:var(--mono); font-size:.8rem; letter-spacing:.1em; color:var(--paper); }
.r17 .hero-link .arr { width:34px; height:34px; border:1px solid rgba(242,240,234,.4); border-radius:99px; display:flex; align-items:center; justify-content:center; font-family:var(--fx); font-size:.85rem; transition:background .18s, color .18s; }
.r17 .hero-link:hover .arr { background:var(--gold); border-color:var(--gold); color:var(--ink); }

/* ─── TICKER ─── */
.r17 .ticker { overflow:hidden; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
.r17 .ticker-row { display:flex; align-items:center; width:max-content; padding:1rem 0; animation:r17tick 34s linear infinite; white-space:nowrap; }
.r17 .ticker-item { font-family:var(--mono); font-size:.7rem; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); padding:0 1.7rem; }
.r17 .ticker-sq { width:4px; height:4px; background:var(--gold); flex:none; }
@keyframes r17tick { from{transform:translateX(0)} to{transform:translateX(-50%)} }

/* ─── STATEMENT — big centered two-tone lines ─── */
.r17 .stmt { padding:clamp(7rem,16vh,12rem) var(--pad); text-align:center; }
.r17 .stmt-h { font-size:clamp(1.9rem,4.2vw,3.6rem); max-width:24ch; margin-inline:auto; }
.r17 .stmt-h .row { display:block; }
.r17 .neither-w { position:relative; display:inline-block; color:var(--gold); }
.r17 .neither-line { position:absolute; left:-.06em; right:-.06em; top:53%; height:.07em; background:var(--gold); transform-origin:left center; }

/* ─── MISSION — ivory inversion, narrow offset column ─── */
.r17 .lt { background:var(--paper); color:var(--ink); }
.r17 .mission { padding:clamp(6rem,12vh,9rem) var(--pad); }
.r17 .mission-grid { display:grid; grid-template-columns:1fr minmax(0,44ch); gap:3rem; max-width:1080px; margin-inline:auto; align-items:start; }
@media(max-width:760px){ .r17 .mission-grid { grid-template-columns:1fr; } }
.r17 .mission-col p { font-size:1.02rem; line-height:1.85; color:var(--ink-mut); }
.r17 .mission-col > div + div { margin-top:1.5rem; } /* paragraphs sit inside Fade wrapper divs */
.r17 .mission-col b { font-weight:500; color:var(--ink); }
.r17 .mission-col p.mission-pull { font-size:clamp(1.4rem,2.4vw,1.9rem); font-weight:400; letter-spacing:-.02em; line-height:1.45; color:var(--ink); }
.r17 .mission-pull em { font-style:normal; color:var(--gold-deep); }

/* ─── STACK — two dark offer cards under mono label ─── */
.r17 .stack { padding:clamp(5rem,10vh,8rem) var(--pad); }
.r17 .stack-inner { max-width:1240px; margin-inline:auto; }
.r17 .stack-cards { display:grid; grid-template-columns:1fr 1fr; gap:clamp(1rem,2vw,1.5rem); margin-top:1.75rem; }
@media(max-width:820px){ .r17 .stack-cards { grid-template-columns:1fr; } }
.r17 .card { background:var(--ink-2); border:1px solid var(--line); border-radius:16px; padding:clamp(1.5rem,3vw,2.25rem); display:flex; flex-direction:column; }
.r17 .card-strip { display:flex; gap:6px; margin-bottom:2rem; }
.r17 .card-strip span { flex:1; aspect-ratio:16/10; overflow:hidden; border-radius:8px; }
.r17 .card-strip img { width:100%; height:100%; object-fit:cover; object-position:top; }
.r17 .card-t { font-size:clamp(1.5rem,2.6vw,2rem); font-weight:400; letter-spacing:-.03em; }
.r17 .card-d { font-size:.92rem; color:var(--mut); margin-top:.4rem; }
.r17 .card ul { list-style:none; margin-top:1.4rem; flex:1; }
.r17 .card li { font-size:.95rem; color:var(--paper); opacity:.85; padding:.75rem 0 .75rem 1.3rem; border-top:1px solid var(--line); position:relative; }
.r17 .card li::before { content:''; position:absolute; left:0; top:1.3rem; width:5px; height:5px; background:var(--gold); border-radius:50%; }
.r17 .card-cta { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1.75rem; padding-top:1.4rem; border-top:1px solid var(--line); }
.r17 .card-cta .k { font-family:var(--mono); font-size:.64rem; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); }
.r17 .btn-line { font-size:.8rem; font-weight:500; padding:.6rem 1.4rem; border:1px solid rgba(242,240,234,.35); border-radius:99px; transition:background .18s, color .18s, border-color .18s; white-space:nowrap; }
.r17 .btn-line:hover { background:var(--gold); color:var(--ink); border-color:var(--gold); }

/* ─── RECORD — ivory, grouped list rows ─── */
.r17 .record { padding:clamp(6rem,12vh,9rem) var(--pad); }
.r17 .record-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.15fr); gap:clamp(3rem,6vw,5.5rem); max-width:1240px; margin-inline:auto; align-items:start; }
@media(max-width:880px){ .r17 .record-grid { grid-template-columns:1fr; } }
.r17 .record-h { font-size:clamp(1.9rem,3.6vw,3rem); font-weight:400; letter-spacing:-.035em; line-height:1.12; margin-top:1.1rem; }
.r17 .record-note { font-size:.98rem; line-height:1.8; color:var(--ink-mut); margin-top:1.4rem; max-width:46ch; }
.r17 .record-stats { display:flex; gap:2.25rem; margin-top:2rem; flex-wrap:wrap; }
.r17 .record-stat b { display:block; font-size:clamp(1.9rem,3vw,2.6rem); font-weight:300; letter-spacing:-.03em; line-height:1; }
.r17 .record-stat span { display:block; font-family:var(--mono); font-size:.6rem; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-dim); margin-top:.5rem; max-width:16ch; line-height:1.6; }
.r17 .record-strip { display:flex; gap:6px; margin-top:2.25rem; }
.r17 .record-strip span { flex:1; aspect-ratio:16/10; overflow:hidden; border-radius:8px; }
.r17 .record-strip img { width:100%; height:100%; object-fit:cover; filter:grayscale(1) contrast(1.05); transition:filter .3s; }
.r17 .record-strip span:hover img { filter:none; }
.r17 .rec-group { display:grid; grid-template-columns:minmax(0,.55fr) 1fr; gap:1rem; }
.r17 .rec-group + .rec-group { margin-top:2.5rem; }
@media(max-width:560px){ .r17 .rec-group { grid-template-columns:1fr; } }
.r17 .rec-rows { border-top:1px solid var(--line-ink); }
.r17 .rec-row { padding:1rem 0; border-bottom:1px solid var(--line-ink); }
.r17 .rec-row b { display:block; font-size:.95rem; font-weight:500; letter-spacing:-.01em; }
.r17 .rec-row span { display:block; font-family:var(--mono); font-size:.64rem; letter-spacing:.08em; color:var(--ink-dim); margin-top:.35rem; }
.r17 .rec-row span i { font-style:normal; padding:0 .55rem; color:var(--line-ink); }

/* ─── VOICES — dark article-card trio ─── */
.r17 .voices { padding:clamp(5rem,10vh,8rem) var(--pad); }
.r17 .voices-inner { max-width:1240px; margin-inline:auto; }
.r17 .voices-head { max-width:44ch; }
.r17 .voices-h { font-size:clamp(1.9rem,3.6vw,3rem); font-weight:400; letter-spacing:-.035em; line-height:1.12; margin-top:1.1rem; }
.r17 .voices-sub { font-size:.98rem; color:var(--mut); margin-top:1.2rem; line-height:1.8; }
.r17 .voice-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(1rem,2vw,1.5rem); margin-top:3rem; }
@media(max-width:880px){ .r17 .voice-grid { grid-template-columns:1fr; } }
.r17 .voice { border:1px solid var(--line); background:var(--ink-2); border-radius:16px; padding:clamp(1.5rem,3vw,2rem); display:flex; flex-direction:column; gap:1.5rem; }
.r17 .voice-m { font-family:var(--mono); font-size:.62rem; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); }
.r17 .voice-q { font-size:.97rem; line-height:1.8; opacity:.88; flex:1; }
.r17 .voice-n b { display:block; font-size:.88rem; font-weight:500; }
.r17 .voice-n span { font-size:.78rem; color:var(--mut); }

/* ─── PLAY — ivory gallery ─── */
.r17 .play { padding:clamp(6rem,12vh,9rem) var(--pad); }
.r17 .play-inner { max-width:1240px; margin-inline:auto; }
.r17 .play-head { display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; flex-wrap:wrap; }
.r17 .play-h { font-size:clamp(2rem,4.4vw,3.8rem); font-weight:400; letter-spacing:-.035em; line-height:1.08; margin-top:1.1rem; }
.r17 .play-h .row { display:block; }
.r17 .work-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:2.5rem; }
@media(max-width:1000px){ .r17 .work-grid { grid-template-columns:repeat(2,1fr); } }
@media(max-width:560px){ .r17 .work-grid { grid-template-columns:1fr; } }
.r17 .vcard { position:relative; aspect-ratio:16/9; overflow:hidden; cursor:pointer; background:var(--ink-2); border-radius:12px; }
.r17 .vcard-v { aspect-ratio:9/16; }
.r17 .vposter { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .6s cubic-bezier(.22,1,.36,1); }
.r17 .vcard:hover .vposter { transform:scale(1.05); }
.r17 .vshade { position:absolute; inset:0; background:rgba(6,6,6,.22); z-index:1; transition:background .25s; }
.r17 .vcard:hover .vshade { background:rgba(6,6,6,.02); }
.r17 .vcap { position:absolute; bottom:8px; left:8px; right:8px; padding:.55rem .85rem; z-index:2; display:flex; justify-content:space-between; align-items:baseline; gap:.5rem; border-radius:8px; background:rgba(10,10,9,.72); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); color:var(--paper); }
.r17 .vcap .nm { font-size:.76rem; font-weight:500; letter-spacing:-.01em; }
.r17 .vcap .tg { font-family:var(--mono); font-size:.56rem; letter-spacing:.14em; text-transform:uppercase; color:var(--mut); }
.r17 .reels-head { display:flex; align-items:center; gap:1rem; margin:2.5rem 0 1rem; }
.r17 .reels-head .bar { flex:1; height:1px; background:var(--line-ink); }
.r17 .reels-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
@media(max-width:1000px){ .r17 .reels-grid { grid-template-columns:repeat(2,1fr); } }

/* ─── CONTACT — dark, centered, ghost wordmark ─── */
.r17 .contact { padding:clamp(7rem,14vh,11rem) var(--pad); text-align:center; position:relative; overflow:hidden; }
.r17 .ghost-mark { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:clamp(340px,52vw,720px); color:rgba(242,240,234,.045); pointer-events:none; }
.r17 .contact-inner { position:relative; z-index:1; max-width:900px; margin-inline:auto; }
.r17 .contact-h { font-size:clamp(2rem,4.4vw,3.8rem); font-weight:400; letter-spacing:-.035em; line-height:1.1; margin-top:1.1rem; }
.r17 .contact-sub { font-size:1rem; color:var(--mut); max-width:52ch; margin:1.4rem auto 0; line-height:1.8; }
.r17 .brief { display:grid; grid-template-columns:1.15fr .85fr; border:1px solid var(--line); background:var(--ink-2); border-radius:16px; text-align:left; margin-top:2.75rem; }
@media(max-width:760px){ .r17 .brief { grid-template-columns:1fr; } }
.r17 .brief-form { padding:clamp(1.5rem,3vw,2.25rem); border-right:1px solid var(--line); display:flex; flex-direction:column; gap:1.4rem; }
@media(max-width:760px){ .r17 .brief-form { border-right:none; border-bottom:1px solid var(--line); } }
.r17 .brief-field { display:flex; flex-direction:column; gap:.45rem; }
.r17 .brief-field label { font-family:var(--mono); font-size:.6rem; letter-spacing:.18em; text-transform:uppercase; color:var(--dim); }
.r17 .brief-field input, .r17 .brief-field textarea {
  background:transparent; border:0; border-bottom:1px solid var(--line);
  color:var(--paper); font-family:var(--fx); font-size:1.02rem; padding:.6rem 0;
  outline:none; resize:none; border-radius:0;
}
.r17 .brief-field input:focus, .r17 .brief-field textarea:focus { border-bottom-color:var(--gold); }
.r17 .btn-gold { display:inline-block; background:var(--gold); color:var(--ink); white-space:nowrap; font-size:.85rem; font-weight:500; padding:.8rem 1.8rem; border-radius:99px; transition:background .18s; align-self:flex-start; }
.r17 .btn-gold:hover { background:var(--gold-deep); }
@media(max-width:760px){ .r17 .brief-form .btn-gold { align-self:stretch; text-align:center; } }
.r17 .brief-side { padding:clamp(1.5rem,3vw,2.25rem); display:flex; flex-direction:column; gap:1.4rem; justify-content:center; }
.r17 .brief-side .k { font-family:var(--mono); font-size:.6rem; letter-spacing:.18em; text-transform:uppercase; color:var(--dim); display:block; margin-bottom:.3rem; }
.r17 .brief-side a { font-size:.96rem; transition:color .15s; }
.r17 .brief-side a:hover { color:var(--gold); }
.r17 .brief-note { font-family:var(--mono); font-size:.62rem; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); }

/* ─── FOOTER — ivory mono columns ─── */
.r17 .foot { padding:4.5rem var(--pad) 2.5rem; }
.r17 .foot-inner { max-width:1240px; margin-inline:auto; }
.r17 .foot-cols { display:grid; grid-template-columns:1.4fr repeat(3,minmax(0,1fr)); gap:2.5rem; }
@media(max-width:820px){ .r17 .foot-cols { grid-template-columns:1fr 1fr; } }
@media(max-width:480px){ .r17 .foot-cols { grid-template-columns:1fr; } }
.r17 .foot-brand { display:flex; align-items:center; gap:.65rem; }
.r17 .foot-mark { width:22px; height:22px; color:var(--ink); }
.r17 .foot-sig { font-size:.92rem; color:var(--ink-mut); margin-top:1rem; max-width:26ch; line-height:1.7; }
.r17 .foot-col .mlb { display:block; margin-bottom:1rem; }
.r17 .foot-col a, .r17 .foot-col span { display:block; font-family:var(--mono); font-size:.74rem; letter-spacing:.04em; color:var(--ink-mut); padding:.3rem 0; transition:color .15s; }
.r17 .foot-col a:hover { color:var(--ink); }
.r17 .foot-base { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-top:3.5rem; padding-top:1.75rem; border-top:1px solid var(--line-ink); }
.r17 .foot-copy { font-family:var(--mono); font-size:.62rem; letter-spacing:.1em; color:var(--ink-dim); }

/* ─── MODAL ─── */
.r17 .modal { position:fixed; inset:0; z-index:900; background:rgba(6,6,6,.9); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:1rem; }
.r17 .modal-box { width:100%; max-width:960px; background:var(--ink-2); border:1px solid var(--line); border-radius:16px; }
.r17 .modal-box.portrait { max-width:min(400px, 92vw); }
.r17 .modal-head { display:flex; align-items:center; justify-content:space-between; padding:.9rem 1.25rem; border-bottom:1px solid var(--line); }
.r17 .modal-head span { font-size:.88rem; font-weight:500; }
.r17 .modal-head button { font-size:1.5rem; line-height:1; color:var(--mut); width:32px; height:32px; display:flex; align-items:center; justify-content:center; transition:color .15s; }
.r17 .modal-head button:hover { color:var(--paper); }
.r17 .modal-vid { position:relative; aspect-ratio:16/9; }
.r17 .modal-box.portrait .modal-vid { aspect-ratio:9/16; max-height:80vh; margin-inline:auto; }
.r17 .modal-vid iframe { position:absolute; inset:0; width:100%; height:100%; border:none; }

@media(prefers-reduced-motion: reduce){
  .r17 .ticker-row { animation:none; }
}
`;

// ─── MOTION PRIMITIVES ────────────────────────────────────────────────────────

const EASE = [0.22, 1, 0.36, 1];

/** Fade-in on view or after mount delay (CSS transitions — rAF throttling safe). */
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

/** Plain text with the gold square period bonded to the last word. */
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

export default function HomeR6Taste() {
  const [video, setVideo] = useState(null);
  const [brief, setBrief] = useState({ name: '', co: '', msg: '' });
  const heroRef = useRef(null);
  const { scrollYProgress: heroProg } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const stageScale = useTransform(heroProg, [0, 1], [1, 1.06]);

  const sendBrief = e => {
    e.preventDefault();
 const subject = `New project, ${brief.name}${brief.co ? ' (' + brief.co + ')' : ''}`;
 const body = `Hi AOM,%0D%0A%0D%0A${encodeURIComponent(brief.msg)}%0D%0A%0D%0A, ${encodeURIComponent(brief.name)}${brief.co ? '·' + encodeURIComponent(brief.co) : ''}`;
    window.location.href = `mailto:hello@aheadofmarket.com?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  // lenis smooth scroll + anchor handling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
      document.removeEventListener('click', onAnchor);
      if (raf) cancelAnimationFrame(raf);
      if (lenis) lenis.destroy();
    };
  }, []);

  // lock body scroll under modal
  useEffect(() => {
    document.body.style.overflow = video ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [video]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="r17">
        <style>{CSS}</style>

        {/* NAV — mono links · centered brand · outlined pill */}
        <nav className="nav">
          <div className="nav-links">
            <a href="#story">Story</a>
            <a href="#work">Work</a>
            <a href="#contact">Contact</a>
          </div>
          <a className="nav-brand" href="/">
            <BrandMark kind="mono" className="nav-mark" />
            <span className="nav-name">Ahead of Market</span>
          </a>
          <a className="nav-cta" href="#contact">Start a project</a>
        </nav>

        {/* HERO — our film is the centerpiece; bottom-anchored two-tone headline */}
        <header className="hero" ref={heroRef}>
          <Fade auto delay={0.15} dur={0.9} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div className="hero-stage" style={{ scale: stageScale }}>
              <LazyGumlet id={HERO_REEL} eager filter="none" bleed={1.14} offsetY={-28} />
            </motion.div>
            <div className="hero-note">
 <span>Now playing, Journey to Gary Vee</span>
 <span>Phoenix, AZ, Since 2020</span>
            </div>
          </Fade>
          <h1 className="hero-h dp">
            <Fade auto delay={0.5} dur={0.9}><span className="row lo">We make companies</span></Fade>
            <Fade auto delay={0.75} dur={0.9}><span className="row">impossible to ignore<span className="sq" /></span></Fade>
          </h1>
          <Fade auto delay={1.1} dur={0.9}>
            <a className="hero-link" href="#contact">start a conversation <span className="arr">↗</span></a>
          </Fade>
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

        {/* STATEMENT — the setup, two-tone */}
        <section className="stmt" id="story">
          <h2 className="stmt-h dp">
            <Fade y={16} dur={0.8}><span className="row lo">Many companies around Phoenix know us as a video company.</span></Fade>
            <Fade y={16} dur={0.8} delay={0.15}><span className="row lo" style={{ marginTop: '.4em' }}>Others as a web development company.</span></Fade>
            <Fade y={16} dur={0.8} delay={0.3}>
              <span className="row" style={{ marginTop: '.8em' }}>
                We're actually{' '}
                <span className="neither-w">
                  neither
                  <motion.span
                    className="neither-line"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
                  />
                </span>{' '}
                of those things<span className="sq" />
              </span>
            </Fade>
          </h2>
        </section>

        {/* MISSION — ivory inversion, narrow offset column */}
        <section className="lt mission">
          <div className="mission-grid">
            <Fade><span className="mlb">Mission</span></Fade>
            <div className="mission-col">
              <Fade delay={0.1}>
 <p className="mission-pull">We're a <em>storytelling company</em>, we just happen to make videos and web apps often<span className="sq" style={{ background: 'var(--gold-deep)' }} /></p>
              </Fade>
              <Fade delay={0.2}>
                <p><b>"A billboard does no good in your basement."</b></p>
              </Fade>
              <Fade delay={0.3}>
 <p>A website or a video is the same, it doesn't help if you don't have a strategy to get it out. That's where we come in.</p>
              </Fade>
              <Fade delay={0.4}>
 <p>We make the marketing materials, but <b>first</b> we figure out exactly how they'll get distributed most effectively. So the work doesn't just look right, it lands where it moves the business.</p>
              </Fade>
            </div>
          </div>
        </section>

        {/* STACK — everything we make, two cards */}
        <section className="stack">
          <div className="stack-inner">
 <Fade><span className="mlb">Everything we make, across the stack</span></Fade>
            <div className="stack-cards">
              <Fade className="card" delay={0.1} y={20}>
                <div className="card-strip" aria-hidden="true">
                  <span><img src="/hero-sites/ambition.jpg" alt="" loading="lazy" /></span>
                  <span><img src="/hero-sites/space-rising.jpg" alt="" loading="lazy" /></span>
                  <span><img src="/hero-sites/valor.jpg" alt="" loading="lazy" /></span>
                </div>
                <h3 className="card-t">Marketing<span className="sq" /></h3>
                <p className="card-d">The materials your message stands on.</p>
                <ul>
                  <li>Websites &amp; web applications</li>
                  <li>Brand films &amp; video series</li>
                  <li>Quizzes &amp; interactive tools for prospects</li>
                  <li>Photography &amp; creative assets</li>
                </ul>
                <div className="card-cta">
 <span className="k">01, Make it</span>
                  <a className="btn-line" href="#contact">Get in touch</a>
                </div>
              </Fade>
              <Fade className="card" delay={0.25} y={20}>
                <div className="card-strip" aria-hidden="true">
                  <span><img src={poster('698a596eaec3d4e420c22a9a', 480)} alt="" loading="lazy" /></span>
                  <span><img src={poster('698a5391fc23d3d76fa7306c', 480)} alt="" loading="lazy" /></span>
                  <span><img src={poster('698a5a8b873071aec5c99c6f', 480)} alt="" loading="lazy" /></span>
                </div>
                <h3 className="card-t">Promotion<span className="sq" /></h3>
                <p className="card-d">How it gets out into the world.</p>
                <ul>
                  <li>Google &amp; Meta ad campaigns</li>
                  <li>Influencer posts &amp; partnerships</li>
                  <li>Email &amp; text-message campaigns</li>
                  <li>SEO &amp; content distribution</li>
                </ul>
                <div className="card-cta">
 <span className="k">02, Move it</span>
                  <a className="btn-line" href="#contact">Get in touch</a>
                </div>
              </Fade>
            </div>
          </div>
        </section>

        {/* RECORD — ivory, grouped list rows */}
        <section className="lt record">
          <div className="record-grid">
            <div>
              <Fade><span className="mlb">Who we are</span></Fade>
              <Fade delay={0.1}>
                <h2 className="record-h"><SqText text="A small team that has done a lot" /></h2>
              </Fade>
              <Fade delay={0.2}>
                <p className="record-note">
                  Our team comes from commercial film production, local news, national media, and creative
 agencies. We've worked across Phoenix, nationally, and internationally, always story-first.
                </p>
              </Fade>
              <Fade delay={0.3}>
                <div className="record-stats">
                  <div className="record-stat"><b>100+</b><span>Projects shipped since 2020</span></div>
 <div className="record-stat"><b>3</b><span>Industries, tech, construction, nonprofits</span></div>
                  <div className="record-stat"><b>8+</b><span>Years in commercial film, news &amp; media</span></div>
                </div>
              </Fade>
              <Fade delay={0.4}>
                <div className="record-strip" aria-hidden="true">
                  <span><img src={poster('698a6296fc23d3d76fa8d992', 480)} alt="" /></span>
                  <span><img src={poster('698a5ef5fc23d3d76fa87ef4', 480)} alt="" /></span>
                  <span><img src={poster('698a584faec3d4e420c20fef', 480)} alt="" /></span>
                </div>
              </Fade>
            </div>
            <div>
              <Fade><span className="mlb" style={{ display: 'block', marginBottom: '2rem' }}>The record</span></Fade>
              {RECORD.map((g, gi) => (
                <Fade className="rec-group" key={g.group} delay={0.1 + gi * 0.1}>
                  <span className="mlb">{g.group}</span>
                  <div className="rec-rows">
                    {g.rows.map(r => (
                      <div className="rec-row" key={r.t}>
                        <b>{r.t}</b>
                        <span>{r.meta[0]}{r.meta[1] ? <><i>|</i>{r.meta[1]}</> : null}</span>
                      </div>
                    ))}
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </section>

        {/* VOICES — dark card trio */}
        <section className="voices">
          <div className="voices-inner">
            <div className="voices-head">
              <Fade><span className="mlb">Voices</span></Fade>
              <Fade delay={0.1}><h2 className="voices-h"><SqText text="What clients say" /></h2></Fade>
              <Fade delay={0.2}>
 <p className="voices-sub">Real outcomes, in their words, not ours.</p>
              </Fade>
            </div>
            <div className="voice-grid">
              {VOICES.map((v, i) => (
                <Fade key={v.n} delay={i * 0.12} y={20} className="voice">
                  <span className="voice-m">{v.m}</span>
                  <p className="voice-q">{v.q}</p>
                  <div className="voice-n">
                    <b>{v.n}</b>
                    <span>{v.c}</span>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </section>

        {/* PLAY — ivory gallery, tap any film */}
        <section className="lt play" id="work">
          <div className="play-inner">
            <div className="play-head">
              <div>
                <Fade><span className="mlb">Our work</span></Fade>
                <h2 className="play-h dp">
                  <Fade delay={0.1}><span className="row lo">Tap any film.</span></Fade>
                  <Fade delay={0.25}><span className="row"><SqText text="Play favorites" /></span></Fade>
                </h2>
              </div>
 <Fade delay={0.3}><span className="mlb">100+ projects, here are a few</span></Fade>
            </div>
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
                  <div className="vcap">
                    <span className="nm">{p.t}</span>
                    <span className="tg">{p.tag}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <Fade className="reels-head">
 <span className="mlb">Reels, made for the feed</span>
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
                  <div className="vcap">
                    <span className="nm">{p.t}</span>
                    <span className="tg">{p.tag}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT — dark, centered, ghost monogram */}
        <section className="contact" id="contact">
          <BrandMark kind="mono" className="ghost-mark" />
          <div className="contact-inner">
            <Fade><span className="mlb" style={{ color: 'var(--gold)' }}>Ready when you are</span></Fade>
            <Fade delay={0.1}>
              <h2 className="contact-h dp"><span className="lo">It all starts with</span> a conversation<span className="sq" /></h2>
            </Fade>
            <Fade delay={0.25}>
              <p className="contact-sub">
 By now you know us a little. We'd love to learn about what you're working on, and how we might be able to help.
              </p>
            </Fade>
            <Fade delay={0.4}>
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
            </Fade>
          </div>
        </section>

        {/* FOOTER — ivory mono columns */}
        <footer className="lt foot">
          <div className="foot-inner">
            <div className="foot-cols">
              <div>
                <div className="foot-brand">
                  <BrandMark kind="mono" className="foot-mark" />
                  <span className="nav-name">Ahead of Market</span>
                </div>
                <p className="foot-sig"><SqText text="A storytelling company from Phoenix, AZ" /></p>
              </div>
              <div className="foot-col">
                <span className="mlb">Navigate</span>
                <a href="#story">Story</a>
                <a href="#work">Work</a>
                <a href="#contact">Contact</a>
              </div>
              <div className="foot-col">
                <span className="mlb">Get in touch</span>
                <a href="mailto:hello@aheadofmarket.com">hello@aheadofmarket.com</a>
                <a href="tel:6023732164">602 373 2164</a>
              </div>
              <div className="foot-col">
                <span className="mlb">Location</span>
 <span>Phoenix, AZ, USA</span>
                <span>Since 2020</span>
              </div>
            </div>
            <div className="foot-base">
              <span className="foot-copy">© 2026 Ahead of Market. All rights reserved.</span>
              <span className="foot-copy">Story. Film. Web. Ads.</span>
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