import React, { useState, useEffect, useRef } from 'react';
import LazyGumlet from '../../components/home/LazyGumlet';
import BrandMark from '../../components/home/BrandMark';

// Mounted at /r5 for review; promote to / when approved. Mission: corner:home-rebrand.
// R7 — full scroll-story: each chapter is a centered full-height scene with a graphic,
// revealing on scroll. By the portfolio you should feel you know AOM.

const TICKER = ["Skylar","PA'LA","Ambition Mechanical","ISA Energy","Brandon Wiley","Space Rising","Included Health","Intelliplay","Valor to Victory","Kohrs"];

const STORIES = [
  { client:'ISA Energy', tag:'Energy · Film', motif:'film',
 big:'3', bigLabel:'video series, live in investor meetings',
    headline:`A three-video series, now in every investor meeting`,
 body:`We launched a three-video series with the ISA team, a product demo, a validation study where it's stress-tested under scientific conditions, and a brand film about their mission. All three are live on their site and running in investor meetings.`,
    stat:`Helped raise a substantial round.` },
  { client:'Space Rising', tag:'Tech · Platform', motif:'grid',
    big:'1,000+', bigLabel:'in one room at Space Congress',
 headline:`SpaceOS, and 1,000 people in one room`,
    body:`We built SpaceOS, their platform for the space industry to gather online with shared resources and insider information. Then we ran heavy sprints to get them ready for big moments like Space Congress.`,
    stat:`Drove a wave of traffic to the new platform.` },
  { client:'Included Health', tag:'Healthcare · Film', motif:'film',
 big:'Top-5', bigLabel:'US insurer, films for their Inspire Summit',
    headline:`Films for one of the largest insurers in the US`,
 body:`We finished a series of videos for Included Health, one of the largest insurance providers in the country, and were proud to work alongside them at their Inspire Summit.`,
    stat:`Produced for the Inspire Summit.` },
  { client:'Ambition Mechanical', tag:'Trades · Web + Ads', motif:'chart',
    big:'4 / mo', bigLabel:'organic leads from the new site alone',
    headline:`Four solid leads a month, organically`,
 body:`We've been running Ambition Mechanical's Google Ads, but the new website we built is already pulling in four solid leads a month on its own, organically, before the ad spend even counts.`,
    stat:`Before paid spend even counts.` },
];

const PORTFOLIO = [
  { t:"Lagos White Party",   id:'698a596eaec3d4e420c22a9a', tag:'Event' },
  { t:"Lagos Recap",         id:'698a5946873071aec5c96163', tag:'Event' },
  { t:"Nook 10 Year",        id:'698a5a8b873071aec5c99c6f', tag:'Brand' },
  { t:"PA'LA x HARUMI",      id:'698a5391fc23d3d76fa7306c', tag:'Brand' },
  { t:"Journey to Gary Vee", id:'698a6296fc23d3d76fa8d992', tag:'Doc'   },
  { t:"Noble Real Estate",   id:'698a5b86fc23d3d76fa82ece', tag:'Brand' },
  { t:"Virtu Hospitality",   id:'698a5ef5fc23d3d76fa87ef4', tag:'Brand' },
  { t:"United Food Bank",    id:'698a5fcdfc23d3d76fa893b8', tag:'Nonprofit' },
  { t:"Abstrakt",            id:'698a5faffc23d3d76fa8909f', tag:'Brand' },
  { t:"Intelliplay",         id:'698a5386aec3d4e420c17a69', tag:'Tech'  },
  { t:"Memorial Towers",     id:'698a584faec3d4e420c20fef', tag:'Real Estate' },
  { t:"Refined Gardens",     id:'698a57fb873071aec5c94350', tag:'Brand' },
];

const VOICES = [
  { q:'The video was a huge tool in recruiting our first 3 cohorts. Every sponsor meeting we played it. It did the selling for us.', n:'Brandon Clarke', c:'Startup AZ Foundation', m:'3 cohorts recruited' },
 { q:'Before AOM we posted randomly. Now we have a repeatable system, the content actually brings people in.', n:'Sumit Seth', c:'Naamly SaaS', m:'Repeatable content engine' },
  { q:'They did not just shoot beautiful footage. They understood who we are and made sure every frame said it.', n:'Gio Osso', c:'Virtu Hospitality Group', m:'Brand story on screen' },
];

const embed = id => `https://play.gumlet.io/embed/${id}?autoplay=true&preload=false&loop=false&background=false&disable_player_controls=false`;

// ─── GLYPHS ───────────────────────────────────────────────────────────────────

const GlyphFilm = () => (
  <svg viewBox="0 0 64 64" className="glyph" aria-hidden="true">
    <rect x="7" y="14" width="50" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    <path d="M27 25 L42 32 L27 39 Z" fill="currentColor"/>
  </svg>
);
const GlyphWeb = () => (
  <svg viewBox="0 0 64 64" className="glyph" aria-hidden="true">
    <rect x="7" y="12" width="50" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    <line x1="7" y1="23" x2="57" y2="23" stroke="currentColor" strokeWidth="2.5"/>
    <circle cx="14" cy="17.5" r="1.7" fill="currentColor"/><circle cx="21" cy="17.5" r="1.7" fill="currentColor"/>
    <path d="M24 41 l-7 -6 l7 -6 M40 41 l7 -6 l-7 -6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);
const GlyphNeither = () => (
  <svg viewBox="0 0 64 64" className="glyph" aria-hidden="true">
    <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    <line x1="16.5" y1="16.5" x2="47.5" y2="47.5" stroke="currentColor" strokeWidth="2.5"/>
  </svg>
);
const GlyphBillboard = () => (
  <svg viewBox="0 0 64 64" className="glyph" aria-hidden="true">
    <rect x="7" y="11" width="50" height="29" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.5"/>
    <line x1="20" y1="40" x2="20" y2="55" stroke="currentColor" strokeWidth="2.5"/>
    <line x1="44" y1="40" x2="44" y2="55" stroke="currentColor" strokeWidth="2.5"/>
  </svg>
);

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
/* tokens */
.r5 {
  --ink:#0B0B0B; --ink-800:#161614; --ink-700:#2A2A28; --ink-500:#6E6E66;
  --ink-300:#A8A49C; --paper:#F6F6F4; --paper-alt:#EEEDE8; --line:#DCD9D2;
  --stone:#B6B2AB; --gold:#C4A46A; --gold-deep:#A8884C;
  --dp:'Bricolage Grotesque',system-ui,Helvetica,Arial,sans-serif;
  --tx:'Schibsted Grotesk',system-ui,Helvetica,Arial,sans-serif;
  --w:min(1200px,calc(100vw - clamp(3rem,8vw,8rem)));
  font-family:var(--tx); color:var(--ink); background:var(--paper);
  font-size:16px; line-height:1.6;
}
.r5 *, .r5 *::before, .r5 *::after { box-sizing:border-box; margin:0; padding:0; }
.r5 a { color:inherit; text-decoration:none; }
.r5 button { font:inherit; cursor:pointer; border:none; background:none; }
.r5 .wrap { width:var(--w); margin-inline:auto; }
.r5 .gold { color:var(--gold); }
.r5 .eyebrow {
  display:inline-flex; align-items:center; gap:.5em;
  font-family:var(--tx); font-size:.75rem; font-weight:600;
  letter-spacing:.12em; text-transform:uppercase; color:var(--ink-500);
  margin-bottom:1rem;
}
.r5 .eyebrow::before { content:''; display:inline-block; width:18px; height:1px; background:var(--gold); }
.r5 .sec-head {
  font-family:var(--dp); font-size:clamp(2rem,5vw,3.75rem);
  font-weight:800; line-height:1.1; letter-spacing:-.025em;
  color:var(--ink); margin-bottom:3rem;
}

/* buttons */
.r5 .btn-gold {
  display:inline-block; background:var(--gold); color:var(--ink-800);
  font-family:var(--tx); font-size:.875rem; font-weight:700;
  letter-spacing:.02em; padding:.75rem 1.5rem; border-radius:4px; transition:background .18s;
}
.r5 .btn-gold:hover { background:var(--gold-deep); }
.r5 .btn-ghost {
  display:inline-block; border:1.5px solid var(--ink-700); color:var(--ink-700);
  font-family:var(--tx); font-size:.875rem; font-weight:600;
  padding:.75rem 1.5rem; border-radius:4px; transition:border-color .18s;
}
.r5 .btn-ghost:hover { border-color:var(--ink); }
.r5 .scene-dark .btn-ghost { border-color:var(--stone); color:var(--paper); }
.r5 .scene-dark .btn-ghost:hover { border-color:var(--paper); }

/* nav */
.r5 .nav {
  position:fixed; top:0; left:0; right:0; z-index:200;
  display:flex; align-items:center; justify-content:space-between;
  padding:0 clamp(1.5rem,5vw,4rem); height:60px;
  background:rgba(246,246,244,.94); backdrop-filter:blur(12px); border-bottom:1px solid var(--line);
}
.r5 .nav-brand { display:flex; align-items:center; gap:.625rem; }
.r5 .nav-mark { width:28px; height:28px; }
.r5 .nav-name { font-family:var(--dp); font-size:.9rem; font-weight:700; letter-spacing:-.01em; }
.r5 .nav-links { display:flex; gap:2rem; }
.r5 .nav-links a { font-size:.875rem; color:var(--ink-500); transition:color .15s; }
.r5 .nav-links a:hover { color:var(--ink); }
@media(max-width:680px){ .r5 .nav-links { display:none; } }

/* progress rail */
.r5 .rail { position:fixed; top:0; left:0; height:2px; background:var(--gold); z-index:300; transition:width .1s linear; }

/* reveal animation */
.r5 .reveal {
  opacity:0; transform:translateY(34px);
  transition:opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1);
  will-change:opacity, transform;
}
.r5 .reveal.rvin { opacity:1; transform:none; }

/* ─── SCENE SYSTEM ─── */
.r5 .scene {
  min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  padding:clamp(6rem,14vh,9rem) clamp(1.5rem,5vw,4rem);
  position:relative; text-align:center;
}
.r5 .scene-inner { width:var(--w); max-width:880px; margin-inline:auto; }
.r5 .scene-light { background:var(--paper); }
.r5 .scene-alt { background:var(--paper-alt); }
.r5 .scene-dark { background:var(--ink-800); color:var(--paper); }
.r5 .scene-ink  { background:var(--ink); color:var(--paper); }
.r5 .scene-dark .eyebrow, .r5 .scene-ink .eyebrow { color:var(--stone); }
.r5 .scene-dark .sec-head, .r5 .scene-ink .sec-head { color:var(--paper); }

/* big centered statement line */
.r5 .statement {
  font-family:var(--dp); font-size:clamp(1.875rem,5.5vw,3.5rem);
  font-weight:800; line-height:1.18; letter-spacing:-.025em; color:var(--paper);
  max-width:16ch; margin-inline:auto;
}
.r5 .statement strong { color:var(--stone); font-weight:800; }
.r5 .statement em { font-style:italic; color:var(--paper); }
.r5 .statement.payoff { font-size:clamp(2.25rem,6.5vw,4.5rem); font-weight:900; max-width:14ch; }
.r5 .statement.payoff .gold { color:var(--gold); }
.r5 .scene-eyebrow {
  display:block; font-size:.72rem; letter-spacing:.16em; text-transform:uppercase;
  color:var(--stone); margin-bottom:2rem;
}

/* scene graphic */
.r5 .glyph { width:clamp(56px,9vw,88px); height:clamp(56px,9vw,88px); color:var(--gold); margin:0 auto 2.5rem; display:block; }
.r5 .scene-mark { width:clamp(64px,11vw,110px); height:auto; margin:0 auto 2.5rem; display:block; }
.r5 .scene-step { display:block; font-family:var(--dp); font-size:.8rem; font-weight:700; letter-spacing:.2em; color:var(--gold-deep); margin-bottom:1.25rem; }
.r5 .scene-dark .scene-step { color:var(--gold); }

/* scroll hint */
.r5 .hint {
  position:absolute; bottom:2.25rem; left:50%; transform:translateX(-50%);
  font-size:.72rem; letter-spacing:.08em; color:var(--stone); white-space:nowrap;
  animation:hintbob 2.4s ease-in-out infinite;
}
@keyframes hintbob { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(7px)} }

/* HOOK */
.r5 .scene-hook {
  background:var(--paper);
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg,var(--line) 1px, transparent 1px);
  background-size:48px 48px; background-position:center center;
}
.r5 .hook-head {
  font-family:var(--dp); font-size:clamp(2.25rem,7vw,5.5rem);
  font-weight:900; line-height:1.06; letter-spacing:-.03em; color:var(--ink); margin:1.25rem 0 1.5rem;
}
.r5 .hook-sub { font-size:.8125rem; letter-spacing:.14em; text-transform:uppercase; color:var(--stone); margin-bottom:2.5rem; }
.r5 .hook-cta { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }

/* TICKER */
.r5 .ticker { overflow:hidden; background:var(--ink-800); border-top:1px solid #1d1d1b; }
.r5 .ticker-row { display:flex; align-items:center; width:max-content; padding:.75rem 0; animation:tickscroll 30s linear infinite; white-space:nowrap; }
.r5 .ticker-item { font-size:.7rem; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--stone); padding:0 1.25rem; }
.r5 .ticker-sep { color:var(--gold); font-size:.6rem; }
@keyframes tickscroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }

/* TWO PARTS scene */
.r5 .two-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-top:1rem; text-align:left; }
@media(max-width:720px){ .r5 .two-grid { grid-template-columns:1fr; } }
.r5 .two-card { background:var(--paper-alt); border:1px solid var(--line); padding:2.5rem; border-radius:6px; }
.r5 .two-num { font-family:var(--dp); font-size:3.5rem; font-weight:900; color:var(--line); line-height:1; margin-bottom:.75rem; }
.r5 .two-title { font-family:var(--dp); font-size:1.875rem; font-weight:800; letter-spacing:-.02em; margin-bottom:.5rem; }
.r5 .two-desc { font-size:1rem; color:var(--ink-500); margin-bottom:1.25rem; }
.r5 .two-list { list-style:none; display:flex; flex-direction:column; gap:.5rem; }
.r5 .two-list li { font-size:.9375rem; color:var(--ink-700); padding-left:1.375rem; position:relative; }
.r5 .two-list li::before { content:'→'; position:absolute; left:0; color:var(--gold); font-size:.8rem; top:.1em; }

/* BILLBOARD scene */
.r5 .billboard-q {
  font-family:var(--dp); font-size:clamp(2rem,5.5vw,4rem);
  font-weight:900; line-height:1.15; letter-spacing:-.025em; color:var(--paper); margin-bottom:2.25rem; max-width:18ch; margin-inline:auto;
}
.r5 .billboard-body { font-size:clamp(1rem,2vw,1.2rem); color:var(--stone); line-height:1.75; max-width:60ch; margin-inline:auto; }
.r5 .billboard-body em { color:var(--gold); font-style:normal; font-weight:600; }

/* WHO / stats scene */
.r5 .who-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; margin:1rem 0 2.5rem; }
@media(max-width:720px){ .r5 .who-stats { grid-template-columns:1fr; } }
.r5 .who-stat { padding:2rem; background:var(--paper); border:1px solid var(--line); border-radius:4px; }
.r5 .scene-alt .who-stat { background:var(--paper); }
.r5 .stat-n { display:block; font-family:var(--dp); font-size:clamp(2.5rem,5vw,4rem); font-weight:900; color:var(--ink); letter-spacing:-.03em; line-height:1; margin-bottom:.5rem; }
.r5 .stat-l { font-size:.875rem; color:var(--ink-500); line-height:1.45; }
.r5 .who-note { font-size:1.0625rem; color:var(--ink-500); max-width:62ch; line-height:1.75; margin-inline:auto; }

/* STORY scenes (media + copy) */
.r5 .story-scene {
  display:grid; grid-template-columns:1.05fr 1fr; gap:clamp(2rem,6vw,5rem);
  align-items:center; width:var(--w); max-width:1100px; margin-inline:auto; text-align:left;
}
.r5 .story-scene.rev .story-media { order:2; }
@media(max-width:860px){ .r5 .story-scene { grid-template-columns:1fr; gap:2.25rem; } .r5 .story-scene.rev .story-media { order:0; } }
.r5 .plate {
  position:relative; aspect-ratio:4/3; border-radius:10px; overflow:hidden;
  background:linear-gradient(150deg,#1c1c1a 0%,var(--ink) 70%);
  border:1px solid #26261f; display:flex; flex-direction:column; justify-content:flex-end;
  padding:clamp(1.5rem,3vw,2.5rem); box-shadow:0 24px 60px -28px rgba(0,0,0,.45);
}
.r5 .plate::before {
  content:''; position:absolute; inset:0; opacity:.5;
  background-image:radial-gradient(circle at 78% 22%, rgba(196,164,106,.22), transparent 55%);
}
.r5 .plate-motif { position:absolute; top:clamp(1.25rem,3vw,2rem); right:clamp(1.25rem,3vw,2rem); width:46px; height:46px; opacity:.5; }
.r5 .plate-motif .glyph { width:46px; height:46px; margin:0; color:var(--gold); }
.r5 .plate-tag { position:relative; font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; color:var(--stone); margin-bottom:.65rem; }
.r5 .plate-big { position:relative; font-family:var(--dp); font-size:clamp(2.75rem,6vw,4.5rem); font-weight:900; letter-spacing:-.03em; line-height:.95; color:var(--paper); }
.r5 .plate-big-label { position:relative; font-size:.95rem; color:var(--stone); margin-top:.5rem; max-width:24ch; line-height:1.5; }
.r5 .beat-tag { font-size:.6875rem; letter-spacing:.12em; text-transform:uppercase; color:var(--stone); display:block; margin-bottom:.6rem; }
.r5 .beat-client { font-family:var(--dp); font-size:clamp(1.75rem,3.5vw,2.5rem); font-weight:800; letter-spacing:-.02em; line-height:1.05; margin-bottom:.75rem; }
.r5 .beat-head { font-family:var(--dp); font-size:1.0625rem; font-weight:700; color:var(--gold-deep); line-height:1.35; margin-bottom:1rem; }
.r5 .beat-body { font-size:1.0625rem; color:var(--ink-500); line-height:1.8; margin-bottom:1.25rem; }
.r5 .beat-stat { display:inline-block; font-size:.875rem; font-weight:600; color:var(--gold-deep); background:rgba(196,164,106,.1); padding:.625rem .875rem; border-radius:3px; border-left:2px solid var(--gold); }

/* VOICES scene */
.r5 .voices-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; margin-top:1rem; text-align:left; }
@media(max-width:900px){ .r5 .voices-grid { grid-template-columns:1fr; } }
.r5 .voice-card { background:var(--paper); border:1px solid var(--line); padding:2rem; border-radius:4px; display:flex; flex-direction:column; justify-content:space-between; gap:1.5rem; }
.r5 .voice-q { font-size:.9375rem; color:var(--ink-700); line-height:1.75; font-style:italic; flex:1; }
.r5 .voice-stat { font-size:.6875rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--gold-deep); margin-bottom:.5rem; }
.r5 .voice-who b { display:block; font-size:.875rem; font-weight:700; color:var(--ink); }
.r5 .voice-who span { font-size:.8125rem; color:var(--ink-500); }

/* CTA scene */
.r5 .scene-cta { background:var(--ink-800); overflow:hidden; }
.r5 .cta-wm { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:clamp(180px,38vw,380px); opacity:.04; pointer-events:none; }
.r5 .cta-inner { position:relative; z-index:1; max-width:620px; margin-inline:auto; }
.r5 .cta-head { font-family:var(--dp); font-size:clamp(2.25rem,6vw,4.25rem); font-weight:900; line-height:1.1; letter-spacing:-.03em; color:var(--paper); margin:1rem 0 1.5rem; }
.r5 .cta-body { font-size:1.0625rem; color:var(--stone); line-height:1.75; margin-bottom:2.5rem; }
.r5 .cta-row { display:flex; gap:1.5rem; align-items:center; justify-content:center; flex-wrap:wrap; }
.r5 .cta-note { font-size:.8125rem; color:var(--stone); }
.r5 .scene-cta .eyebrow { color:var(--gold); }

/* PORTFOLIO (closing reel — normal block, not forced full-height) */
.r5 .ch-work { padding:clamp(5rem,10vw,9rem) 0; background:var(--paper); text-align:center; }
.r5 .work-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-top:2.5rem; }
@media(max-width:1000px){ .r5 .work-grid { grid-template-columns:repeat(3,1fr); } }
@media(max-width:640px) { .r5 .work-grid { grid-template-columns:repeat(2,1fr); } }
.r5 .vcard { position:relative; aspect-ratio:16/9; overflow:hidden; cursor:pointer; background:var(--ink-800); border-radius:4px; }
.r5 .vcthumb { position:absolute; inset:0; width:100%; height:100%; }
.r5 .vshade { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 60%); z-index:1; }
.r5 .vpl { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2; width:40px; height:40px; border-radius:50%; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; font-size:1.125rem; color:#fff; opacity:0; transition:opacity .2s; }
.r5 .vcard:hover .vpl { opacity:1; }
.r5 .vcap { position:absolute; bottom:0; left:0; right:0; padding:.75rem; z-index:2; text-align:left; }
.r5 .vcap .nm { font-size:.8rem; font-weight:600; color:#fff; }
.r5 .vcap .tg { font-size:.65rem; color:rgba(255,255,255,.55); }

/* FOOTER */
.r5 .foot { padding:3rem 0; background:var(--ink-800); border-top:1px solid #191917; }
.r5 .foot-top { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:2rem; margin-bottom:2.5rem; }
.r5 .foot-brand { display:flex; align-items:center; gap:.625rem; color:var(--stone); font-size:.875rem; }
.r5 .foot-mark { width:24px; height:24px; }
.r5 .foot-links { display:flex; flex-wrap:wrap; gap:1.5rem; }
.r5 .foot-links a { font-size:.8125rem; color:var(--stone); transition:color .15s; }
.r5 .foot-links a:hover { color:var(--paper); }
.r5 .foot-base { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding-top:2rem; border-top:1px solid #191917; }
.r5 .foot-sig { font-family:var(--dp); font-size:.875rem; color:var(--stone); }
.r5 .foot-copy { font-size:.75rem; color:#383836; }

/* MODAL */
.r5 .modal { position:fixed; inset:0; z-index:900; background:rgba(11,11,11,.88); display:flex; align-items:center; justify-content:center; padding:1rem; }
.r5 .modal-box { width:100%; max-width:920px; background:var(--ink-800); border-radius:8px; overflow:hidden; }
.r5 .modal-head { display:flex; align-items:center; justify-content:space-between; padding:.875rem 1.25rem; border-bottom:1px solid #1d1d1b; }
.r5 .modal-head span { font-size:.875rem; color:var(--stone); }
.r5 .modal-head button { font-size:1.625rem; line-height:1; color:var(--stone); width:32px; height:32px; display:flex; align-items:center; justify-content:center; transition:color .15s; }
.r5 .modal-head button:hover { color:var(--paper); }
.r5 .modal-vid { position:relative; aspect-ratio:16/9; }
.r5 .modal-vid iframe { position:absolute; inset:0; width:100%; height:100%; border:none; }

@media(prefers-reduced-motion: reduce){
  .r5 .reveal { opacity:1; transform:none; transition:none; }
  .r5 .ticker-row, .r5 .hint { animation:none; }
}
`;

// ─── REVEAL HELPER ────────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = '', as: Tag = 'div', ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('rvin');
        io.disconnect();
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -12% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <Tag ref={ref} className={'reveal ' + className} {...rest}>{children}</Tag>;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function HomeR5Preview() {
  const [video, setVideo] = useState(null);
  const [prog, setProg] = useState(0);

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
    import('lenis').then(({ default: Lenis }) => {
      if (!alive) return;
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      const loop = t => { lenis.raf(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      alive = false;
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (lenis) lenis.destroy();
    };
  }, []);

  return (
    <div className="r5">
      <style>{CSS}</style>
      <div className="rail" style={{ width: prog + '%' }} />

      {/* NAV */}
      <nav className="nav">
        <div className="nav-brand">
          <BrandMark kind="mono" className="nav-mark" />
          <span className="nav-name">Ahead of Market</span>
        </div>
        <div className="nav-links">
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
        </div>
        <a className="btn-gold" href="#contact">Start a project ↗</a>
      </nav>

      {/* SCENE 1 — HOOK */}
      <section className="scene scene-hook">
        <div className="scene-inner">
          <span className="eyebrow">Phoenix, AZ · Since 2020</span>
          <h1 className="hook-head">
            Hi. We're Ahead Of Market™.<br />
            <span className="gold">We make companies<br />impossible to ignore.</span>
          </h1>
          <p className="hook-sub">Story · Film · Web · Ads</p>
          <div className="hook-cta">
            <a className="btn-gold" href="#contact">Start a conversation ↗</a>
            <a className="btn-ghost" href="#work">See our work</a>
          </div>
        </div>
        <div className="hint">scroll to meet us ↓</div>
      </section>

      {/* TICKER */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-row">
          {[...TICKER, ...TICKER].map((t, i) => (
            <React.Fragment key={i}>
              <span className="ticker-item">{t}</span>
              <span className="ticker-sep">/</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* SCENE 2 — IDENTITY: video company */}
      <section className="scene scene-dark">
        <div className="scene-inner">
 <Reveal><span className="scene-eyebrow">So, who are we, exactly?</span></Reveal>
          <Reveal delay={120}><GlyphFilm /></Reveal>
          <Reveal delay={220}>
            <p className="statement">Many companies around Phoenix know us as a <strong>video company</strong>.</p>
          </Reveal>
        </div>
      </section>

      {/* SCENE 3 — IDENTITY: web company */}
      <section className="scene scene-dark">
        <div className="scene-inner">
          <Reveal><GlyphWeb /></Reveal>
          <Reveal delay={120}>
            <p className="statement">Others know us as a <strong>web development company</strong>.</p>
          </Reveal>
        </div>
      </section>

      {/* SCENE 4 — IDENTITY: neither */}
      <section className="scene scene-ink">
        <div className="scene-inner">
          <Reveal><GlyphNeither /></Reveal>
          <Reveal delay={120}>
            <p className="statement">We're actually <em>neither</em> of those things.</p>
          </Reveal>
        </div>
      </section>

      {/* SCENE 5 — IDENTITY: the payoff */}
      <section className="scene scene-dark">
        <div className="scene-inner">
          <Reveal><BrandMark kind="mono" className="scene-mark" /></Reveal>
          <Reveal delay={140}>
 <p className="statement payoff">We're a <span className="gold">storytelling company</span>, we just happen to make videos and web apps often.</p>
          </Reveal>
        </div>
      </section>

      {/* SCENE 6 — TWO PARTS */}
      <section className="scene scene-light">
        <div className="scene-inner">
          <Reveal>
            <span className="eyebrow">What we actually do</span>
            <h2 className="sec-head">Everything we make<br />falls into two parts.</h2>
          </Reveal>
          <div className="two-grid">
            <Reveal delay={60} className="two-card">
              <div className="two-num">01</div>
              <h3 className="two-title">Marketing</h3>
              <p className="two-desc">The materials your message stands on.</p>
              <ul className="two-list">
                <li>Websites &amp; web applications</li>
                <li>Brand films &amp; video series</li>
                <li>Quizzes &amp; interactive tools for prospects</li>
                <li>Photography &amp; creative assets</li>
              </ul>
            </Reveal>
            <Reveal delay={180} className="two-card">
              <div className="two-num">02</div>
              <h3 className="two-title">Promotion</h3>
              <p className="two-desc">How it gets out into the world.</p>
              <ul className="two-list">
                <li>Google &amp; Meta ad campaigns</li>
                <li>Influencer posts &amp; partnerships</li>
                <li>Email &amp; text-message campaigns</li>
                <li>SEO &amp; content distribution</li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SCENE 7 — BILLBOARD */}
      <section className="scene scene-ink">
        <div className="scene-inner">
          <Reveal><GlyphBillboard /></Reveal>
          <Reveal delay={120}>
            <p className="billboard-q">"A billboard does no good in your basement."</p>
          </Reveal>
          <Reveal delay={220}>
            <p className="billboard-body">
 A website or a video is the same, it doesn't help if you don't have a strategy to get it out.
              That's where we come in. We make the marketing materials, but <em>first</em> we figure out exactly how they'll get distributed most effectively.
            </p>
          </Reveal>
        </div>
      </section>

      {/* SCENE 8 — WHO WE ARE */}
      <section className="scene scene-alt">
        <div className="scene-inner">
          <Reveal>
            <span className="eyebrow">Who we are</span>
            <h2 className="sec-head">A small team<br />that has done a lot.</h2>
          </Reveal>
          <div className="who-stats">
            <Reveal className="who-stat">
              <span className="stat-n">100+</span>
              <span className="stat-l">projects shipped since 2020</span>
            </Reveal>
            <Reveal delay={100} className="who-stat">
              <span className="stat-n">3</span>
 <span className="stat-l">industries, Tech, Construction, Nonprofits</span>
            </Reveal>
            <Reveal delay={200} className="who-stat">
              <span className="stat-n">8+</span>
              <span className="stat-l">years in commercial film, news &amp; media</span>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <p className="who-note">
              Our team comes from commercial film production, local news, national media, and creative agencies.
 We've worked across Phoenix, nationally, and internationally, always story-first.
            </p>
          </Reveal>
        </div>
      </section>

      {/* SCENES 9–12 — STORY BEATS (the work, one scene each) */}
      {STORIES.map((s, i) => (
        <section className={'scene ' + (i % 2 ? 'scene-alt' : 'scene-light')} key={s.client}>
          <div className={'story-scene' + (i % 2 ? ' rev' : '')}>
            <Reveal className="story-media">
              <div className="plate">
                <div className="plate-motif">{s.motif === 'web' ? <GlyphWeb /> : s.motif === 'grid' ? <GlyphBillboard /> : s.motif === 'chart' ? <GlyphBillboard /> : <GlyphFilm />}</div>
                <span className="plate-tag">{s.tag}</span>
                <span className="plate-big">{s.big}</span>
                <span className="plate-big-label">{s.bigLabel}</span>
              </div>
            </Reveal>
            <Reveal delay={140} className="story-copy">
              <span className="beat-tag">{i === 0 ? 'Some recent work · ' : ''}{String(i + 1).padStart(2, '0')} / {String(STORIES.length).padStart(2, '0')}</span>
              <h3 className="beat-client">{s.client}</h3>
              <p className="beat-head">{s.headline}</p>
              <p className="beat-body">{s.body}</p>
              <span className="beat-stat">{s.stat}</span>
            </Reveal>
          </div>
        </section>
      ))}

      {/* SCENE 13 — VOICES */}
      <section className="scene scene-alt">
        <div className="scene-inner">
          <Reveal><h2 className="sec-head">What clients say.</h2></Reveal>
          <div className="voices-grid">
            {VOICES.map((v, i) => (
              <Reveal key={v.n} delay={i * 90} className="voice-card">
                <p className="voice-q">"{v.q}"</p>
                <div>
                  <div className="voice-stat">{v.m}</div>
                  <div className="voice-who">
                    <b>{v.n}</b>
                    <span>{v.c}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SCENE 14 — CTA */}
      <section className="scene scene-cta" id="contact">
        <BrandMark kind="mono" className="cta-wm" />
        <div className="cta-inner">
          <Reveal>
            <span className="eyebrow">Ready when you are</span>
            <h2 className="cta-head">It all starts with<br />a conversation.</h2>
            <p className="cta-body">
 By now you know us a little. We'd love to learn about what you're working on, and how we might be able to help.
            </p>
            <div className="cta-row">
              <a className="btn-gold" href="mailto:hello@aheadofmarket.com">Say hello ↗</a>
              <span className="cta-note">We reply within 24 hours.</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CLOSING REEL — PORTFOLIO */}
      <section className="ch-work" id="work">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">Our work</span>
            <h2 className="sec-head">100+ projects.<br />Here are a few.</h2>
          </Reveal>
          <div className="work-grid">
            {PORTFOLIO.map(p => (
              <div className="vcard" key={p.t} onClick={() => setVideo(p)}>
                <LazyGumlet id={p.id} className="vcthumb" />
                <div className="vshade" />
                <span className="vpl">▶</span>
                <div className="vcap">
                  <div className="nm">{p.t}</div>
                  <div className="tg">{p.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand">
              <BrandMark kind="mono" className="foot-mark" />
              <span>Ahead of Market</span>
            </div>
            <div className="foot-links">
              <a href="#work">Work</a>
              <a href="#contact">Contact</a>
              <a href="mailto:hello@aheadofmarket.com">hello@aheadofmarket.com</a>
              <a href="tel:6023732164">602 373 2164</a>
            </div>
          </div>
          <div className="foot-base">
            <span className="foot-sig">A storytelling studio.</span>
            <span className="foot-copy">© 2026 Ahead of Market. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* VIDEO MODAL */}
      {video && (
        <div className="modal" onClick={e => e.target === e.currentTarget && setVideo(null)}>
          <div className="modal-box">
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
  );
}