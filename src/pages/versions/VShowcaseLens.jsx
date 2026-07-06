import React, { useState, useEffect, useMemo, useRef } from 'react';
import LazyGumlet from '../../components/home/LazyGumlet';
import BrandMark from '../../components/home/BrandMark';

/**
 * HomeR5Preview -- AOM marketing home reimagined in the NEW brand
 * (Bricolage Grotesque + Schibsted Grotesk, obsidian/ivory/champagne gold,
 * hairline editorial grid, globe + monogram marks, period-as-signature).
 *
 * Real content + real Gumlet video (hero reel deck, portfolio tiles, click-to-
 * play modal). Mounted at /r5 for review; promote to / when approved.
 * Mission: corner:home-rebrand.
 */

const playerEmbed = (id) => `https://play.gumlet.io/embed/${id}?autoplay=true`;

const HERO_DECK = [
  { id: '698a596eaec3d4e420c22a9a', client: 'Lagos White Party', tag: 'Event promo', time: '0:30' },
  { id: '698a5946873071aec5c96163', client: 'Lagos Recap', tag: 'Highlight' },
  { id: '698a5a8b873071aec5c99c6f', client: 'Nook 10 Year', tag: 'Creative' },
];

// Big reel pools so the hero reads as VOLUME (we make a lot), not three clips.
const DECK_REELS = [
  { id: '698a596eaec3d4e420c22a9a', client: 'Lagos White Party' },
  { id: '698a5946873071aec5c96163', client: 'Lagos Recap' },
  { id: '698a5a8b873071aec5c99c6f', client: 'Nook 10 Year' },
  { id: '698a5391fc23d3d76fa7306c', client: "PA'LA x HARUMI" },
  { id: '698a53bcfc23d3d76fa736e4', client: 'Cook & Craft' },
  { id: '698a5c0afc23d3d76fa83ba6', client: 'Killer Whale Club' },
  { id: '698a580bfc23d3d76fa7bd7c', client: "Tiffany's" },
  { id: '698a581daec3d4e420c20b94', client: 'Primrose Ambition' },
  { id: '698a5a7d873071aec5c99b08', client: 'NGOTS Restoration' },
];
const FILMS = [
  { id: '698a6296fc23d3d76fa8d992', client: 'Journey to Gary Vee' },
  { id: '698a5b86fc23d3d76fa82ece', client: 'Noble Real Estate' },
  { id: '698a6106aec3d4e420c2fd85', client: 'Rainbow Rider' },
  { id: '698a5d24aec3d4e420c2a0a0', client: 'Pretty Penny' },
  { id: '698a5ef5fc23d3d76fa87ef4', client: 'Virtu Hospitality' },
  { id: '698a64e5873071aec5ca99ac', client: 'AZ Arts Foundation' },
  { id: '698a6177873071aec5ca4374', client: 'Keep it Cut' },
  { id: '698a5fcdfc23d3d76fa893b8', client: 'United Food Bank' },
];
// V1 mosaic: 6-col x 3-row wall with a few spanning tiles for a masonry feel.
const MOSAIC = [
  { id: '698a596eaec3d4e420c22a9a', cs: 2, rs: 2 },
  { id: '698a6296fc23d3d76fa8d992', cs: 2, rs: 1 },
  { id: '698a5c0afc23d3d76fa83ba6', cs: 1, rs: 1 },
  { id: '698a53bcfc23d3d76fa736e4', cs: 1, rs: 2 },
  { id: '698a5ef5fc23d3d76fa87ef4', cs: 1, rs: 1 },
  { id: '698a5391fc23d3d76fa7306c', cs: 1, rs: 1 },
  { id: '698a580bfc23d3d76fa7bd7c', cs: 2, rs: 1 },
  { id: '698a5946873071aec5c96163', cs: 1, rs: 1 },
  { id: '698a5fcdfc23d3d76fa893b8', cs: 1, rs: 1 },
  { id: '698a581daec3d4e420c20b94', cs: 1, rs: 1 },
];

const TICKER = [
  'Skylar', "PA'LA", 'Ambition Mechanical', 'ISA Energy', 'Brandon Wiley',
  'Space Rising', 'Included Health', 'Intelliplay', 'Valor to Victory', 'Kohrs',
];

const FEATURED = { t: 'Journey to Gary Vee', s: 'Cinematic brand story, concept to final cut.', id: '698a6296fc23d3d76fa8d992', tag: 'Narrative' };

const PORTFOLIO = [
  { t: 'Virtu Hospitality', s: 'Scottsdale premium', id: '698a5ef5fc23d3d76fa87ef4', cat: 'Brands', tag: 'Luxury', metric: '3 venue launches' },
  { t: 'Aiper Homeshow', s: 'Event recap', id: '698a58ae873071aec5c953ea', cat: 'Brands', tag: 'Consumer', metric: 'Event recap' },
  { t: 'United Food Bank', s: 'Year end impact', id: '698a5fcdfc23d3d76fa893b8', cat: 'Brands', tag: 'Non-profit', metric: 'Year end impact' },
  { t: 'Abstrakt', s: 'SaaS explainer', id: '698a5faffc23d3d76fa8909f', cat: 'Founders', tag: 'SaaS', metric: 'Product explainer' },
  { t: 'Intelliplay', s: 'Product story', id: '698a5386aec3d4e420c17a69', cat: 'Founders', tag: 'UX', metric: 'Product story' },
  { t: 'Gitex Dubai', s: 'Global tech expo', id: '698a6227fc23d3d76fa8cd57', cat: 'Founders', tag: 'Tech', metric: 'Global expo' },
  { t: 'To Have and To Host', s: 'Residential build', id: '698a68b7fc23d3d76fa970ef', cat: 'Construction', tag: 'Build', metric: 'Residential build' },
  { t: 'Memorial Towers', s: 'Industrial scale', id: '698a584faec3d4e420c20fef', cat: 'Construction', tag: 'Industrial', metric: 'Industrial scale' },
  { t: 'Refined Gardens', s: 'Brand authority', id: '698a57fb873071aec5c94350', cat: 'Construction', tag: 'Landscaping', metric: 'Brand authority' },
];

const TABS = ['All', 'Brands', 'Founders', 'Construction'];
const SPANS = [5, 4, 3]; // varied widths, fills a 12-col row every 3 tiles

// Portfolio shown as category rows, Construction first. Two media: Video + Web.
const VIDEO_ROWS = [
  { cat: 'Construction', items: [
    { t: 'To Have and To Host', id: '698a68b7fc23d3d76fa970ef', tag: 'Build', slug: 'to-have-and-to-host' },
    { t: 'Abrazo Healthcare', id: '698a58aefc23d3d76fa7cdd6', tag: 'HVAC' },
    { t: 'Memorial Towers', id: '698a584faec3d4e420c20fef', tag: 'Industrial' },
    { t: 'Refined Gardens', id: '698a57fb873071aec5c94350', tag: 'Landscaping' },
    { t: 'Tree Guardian', id: '698a5e91873071aec5c9fc36', tag: 'Documentary' },
    { t: 'AZ Cleantech', id: '698a57da873071aec5c93fa0', tag: 'Green B2B' },
  ] },
  { cat: 'Brands', items: [
    { t: 'Journey to Gary Vee', id: '698a6296fc23d3d76fa8d992', tag: 'Narrative' },
    { t: 'Virtu Hospitality', id: '698a5ef5fc23d3d76fa87ef4', tag: 'Luxury' },
    { t: 'Noble Real Estate', id: '698a5b86fc23d3d76fa82ece', tag: 'Real estate' },
    { t: 'Pretty Penny', id: '698a5d24aec3d4e420c2a0a0', tag: 'Food' },
    { t: 'Aiper Homeshow', id: '698a58ae873071aec5c953ea', tag: 'Consumer' },
    { t: 'United Food Bank', id: '698a5fcdfc23d3d76fa893b8', tag: 'Non-profit' },
  ] },
  { cat: 'Founders', items: [
    { t: 'Abstrakt', id: '698a5faffc23d3d76fa8909f', tag: 'SaaS' },
    { t: 'Reelay', id: '698a5aa5aec3d4e420c263c4', tag: 'Software' },
    { t: 'Intelliplay', id: '698a5386aec3d4e420c17a69', tag: 'Product' },
    { t: 'Gitex Dubai', id: '698a6227fc23d3d76fa8cd57', tag: 'Global tech' },
    { t: 'NEB Docs / HUUB', id: '698a63acfc23d3d76fa8f585', tag: 'GovTech' },
    { t: 'IAAPA 2026', id: '698a5391aec3d4e420c17bd3', tag: 'Event' },
  ] },
];
const WEB_ROWS = [
  { cat: 'Construction', items: [
    { t: 'Ambition Mechanical', url: '/brands/ambition', tag: 'Mechanical', domain: 'aheadofmarket.com/brands/ambition' },
    { t: 'Ambition Performance', url: '/brands/ambition/performance', tag: 'Campaign', domain: 'aheadofmarket.com/brands/ambition/performance' },
  ] },
  { cat: 'Brands', items: [
    { t: 'Valor to Victory', url: '/brands/valor', tag: 'Brand', domain: 'aheadofmarket.com/brands/valor' },
    { t: 'Artlink', url: '/brands/artlink', tag: 'Arts', domain: 'aheadofmarket.com/brands/artlink' },
    { t: 'Space Rising', url: '/brands/space-rising', tag: 'Platform', domain: 'aheadofmarket.com/brands/space-rising' },
  ] },
  { cat: 'Founders', items: [
    { t: 'S3C', url: '/brands/s3c', tag: 'Platform', domain: 'aheadofmarket.com/brands/s3c' },
    { t: 'Included Health', url: '/brands/included-health', tag: 'Health', domain: 'aheadofmarket.com/brands/included-health' },
  ] },
];

const TRUST = [
  { k: 'Clear timelines', v: 'On time', d: 'You know what is happening and when. We hold the dates we give you.' },
  { k: 'Fast turnarounds', v: '24 to 72 hr', d: 'Need social cuts or selects quickly? You get them in days, not weeks.' },
  { k: 'No middlemen', v: 'One team', d: 'The people who make the work are the people you talk to.' },
  { k: 'Consistent look', v: 'Repeatable', d: 'Every piece looks like it came from the same team, because it did.' },
];

const SERVICES = [
  { n: '01', t: 'Brand films', d: 'Films that show what you do and why it matters.' },
  { n: '02', t: 'Ads and social', d: 'Short videos cut for Meta, YouTube, and TikTok.' },
  { n: '03', t: 'Websites', d: 'Sites that are fast, clear, and easy to update.' },
  { n: '04', t: 'Branding', d: 'A logo, colors, and type that hold together.' },
  { n: '05', t: 'Photography', d: 'Product, team, and location photos for the brand.' },
  { n: '06', t: 'Events', d: 'On site coverage, cut into a film and clips.' },
];

const ONLINE_STEPS = [
  ['1', 'Tell us what you need', 'A sentence is fine. "Make me a 30 second ad." "Fix the homepage." "Build me a brand."'],
  ['2', 'Send us your files', 'Photos, raw footage, an old website, a logo. Whatever you already have, we will use.'],
  ['3', 'We reply in 24 hours', 'A real person, with a price, a timeline, and any questions left open.'],
  ['4', 'Rough draft in 48 to 72 hours', 'You see the work fast. Then we refine it with you until it is right.'],
];
const PERSON_STEPS = [
  ['1', 'Book a visit', 'Come to our space or we come to yours. Coffee on us.'],
  ['2', 'Plan it together', 'We figure out the story, the look, and the timeline in one sitting.'],
  ['3', 'We shoot or design it', 'Cameras, designers, writers. Whatever the job needs.'],
  ['4', 'You leave with the work', 'Same week, most of the time. Edits handled remotely after.'],
];

const VOICES = [
  { q: 'The video was a huge tool in recruiting our first 3 cohorts and showing people what we are about.', m: '3 cohorts, 40+ founders', n: 'Brandon Clarke', c: 'Startup AZ Foundation, Tech investments' },
  { q: 'Before AOM we posted randomly. Now we have a repeatable system that fills our pipeline. Our outreach finally has teeth.', m: '150% pipeline growth', n: 'Sumit Seth', c: 'Naamly, SaaS' },
  { q: 'They did not just shoot beautiful footage. They showed people the place I created had legacy.', m: '3 venue launches', n: 'Gio Osso', c: 'Virtu Hospitality Group, Hospitality' },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap');
.r5{--ink:#0B0B0B;--ink-800:#161614;--ink-700:#2A2A28;--ink-500:#6E6E66;--ink-300:#A8A49C;--paper:#F6F6F4;--paper-alt:#EEEDE8;--line:#DCD9D2;--stone:#B6B2AB;--gold:#C4A46A;--gold-deep:#A8884C;--display:'Bricolage Grotesque',system-ui,Helvetica,Arial,sans-serif;--text:'Schibsted Grotesk',system-ui,Helvetica,Arial,sans-serif;}
.r5,.r5 *{margin:0;padding:0;box-sizing:border-box}
.r5{font-family:var(--text);background:var(--paper);color:var(--ink);font-size:16px;-webkit-font-smoothing:antialiased;}
.r5 .wrap{max-width:1280px;margin:0 auto;padding:0 48px;}
.r5 .disp{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;line-height:.9;}
.r5 .gold{color:var(--gold);}
.r5 .kicker{font-family:var(--text);font-weight:500;font-size:12px;letter-spacing:.22em;text-transform:uppercase;}
.r5 .dot{display:inline-block;width:.5em;height:.5em;background:var(--gold);margin-left:.1em;vertical-align:baseline;}
.r5 .lbl{font-family:var(--text);font-weight:600;font-size:11px;letter-spacing:.14em;text-transform:uppercase;border:1px solid currentColor;padding:4px 9px;display:inline-block;}
.r5 .mark svg{display:block;width:100%;height:100%;}
.r5 .btn{font-family:var(--text);font-weight:600;font-size:15px;letter-spacing:.01em;padding:15px 26px;display:inline-flex;align-items:center;gap:10px;border:1px solid var(--ink);background:var(--ink);color:var(--paper);text-transform:uppercase;cursor:pointer;text-decoration:none;}
.r5 .btn.gold{background:var(--gold);border-color:var(--gold);color:var(--ink);}
.r5 .btn.ghost-light{background:transparent;color:var(--paper);border-color:#454440;}
.r5 .btn.ghost-ink{background:transparent;color:var(--ink);}

.r5 .nav{border-bottom:1px solid var(--line);background:var(--paper);position:sticky;top:0;z-index:40;}
.r5 .nav .row{display:flex;align-items:center;justify-content:space-between;height:84px;}
.r5 .nav .brand{display:flex;align-items:center;gap:13px;}
.r5 .nav .brand .mk{width:34px;height:34px;color:var(--ink);}
.r5 .nav .brand .wm{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:17px;letter-spacing:.01em;}
.r5 .nav .links{display:flex;gap:30px;}
.r5 .nav .links a{color:var(--ink);text-decoration:none;}

.r5 .hero{background:var(--ink);color:var(--paper);position:relative;overflow:hidden;min-height:780px;display:flex;align-items:center;}
.r5 .hero .wrap{position:relative;z-index:3;width:100%;}
/* ---- Hero text lockup (trimmed: kicker + headline + CTA) ---- */
.r5 .hlock{max-width:680px;}
.r5 .hlock.center{max-width:920px;margin:0 auto;text-align:center;}
.r5 .hlock .kick{display:inline-flex;align-items:center;gap:9px;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--stone);margin-bottom:26px;}
.r5 .hlock.light .kick{color:var(--ink-500);}
.r5 .hlock .kick .ledot{width:7px;height:7px;background:var(--gold);display:inline-block;animation:r5pulse 2s infinite;}
@keyframes r5pulse{0%,100%{opacity:1}50%{opacity:.35}}
.r5 .hlock h1{font-size:76px;line-height:.92;}
.r5 .hlock.center h1{font-size:90px;}
.r5 .hlock .cta{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:34px;}
.r5 .hlock.center .cta{justify-content:center;}

.r5 .heromedia{position:absolute;inset:0;z-index:1;}
.r5 .scrim{position:absolute;inset:0;z-index:2;pointer-events:none;}
@keyframes r5left{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes r5up{from{transform:translateY(0)}to{transform:translateY(-50%)}}
@keyframes r5down{from{transform:translateY(-50%)}to{transform:translateY(0)}}

/* ---- 1 & 2: Line — running reel of bigger clips fading across a center line ---- */
.r5 .heroline{flex-direction:column;justify-content:center;gap:60px;}
.r5 .heroline.light{background:var(--paper);color:var(--ink);}
.r5 .heroline.dark{background:var(--ink);color:var(--paper);}
.r5 .heroline .hltop{position:relative;z-index:3;width:100%;}
.r5 .lineband{position:relative;width:100%;}
.r5 .lineband::before{content:'';position:absolute;left:0;right:0;top:50%;height:1px;}
.r5 .heroline.light .lineband::before{background:var(--line);}
.r5 .heroline.dark .lineband::before{background:var(--ink-700);}
.r5 .linereel{position:relative;overflow:hidden;-webkit-mask:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);mask:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);}
.r5 .lrtrack{display:flex;gap:22px;width:max-content;align-items:center;animation:r5left 60s linear infinite;padding:34px 22px;}
.r5 .lrtile{position:relative;width:380px;aspect-ratio:16/9;flex:none;overflow:hidden;cursor:pointer;}
.r5 .heroline.light .lrtile{border:1px solid var(--line);}
.r5 .heroline.dark .lrtile{border:1px solid var(--ink-700);}

/* ---- 3: Columns refined — twin drifting columns, bigger tiles, more air ---- */
.r5 .herocols{background:var(--ink);color:var(--paper);}
.r5 .inner2{display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:center;}
.r5 .cols2{position:relative;height:620px;display:grid;grid-template-columns:1fr 1fr;gap:18px;-webkit-mask:linear-gradient(transparent,#000 10%,#000 90%,transparent);mask:linear-gradient(transparent,#000 10%,#000 90%,transparent);}
.r5 .c2{display:flex;flex-direction:column;gap:18px;}
.r5 .c2.up{animation:r5up 40s linear infinite;}
.r5 .c2.down{animation:r5down 46s linear infinite;}
.r5 .c2tile{position:relative;overflow:hidden;aspect-ratio:9/15;border:1px solid var(--ink-700);flex:none;cursor:pointer;}

/* ---- 4: Film — one big film rotating through random clips ---- */
.r5 .herofilm{background:var(--ink);color:var(--paper);}
.r5 .rfilm{position:absolute;inset:0;z-index:1;}
.r5 .rlayer{position:absolute;inset:0;opacity:0;transition:opacity 1.6s ease-in-out;will-change:opacity;}
.r5 .rlayer.on{opacity:1;}
.r5 .v3scrim{background:linear-gradient(90deg,rgba(11,11,11,.95) 8%,rgba(11,11,11,.55) 45%,rgba(11,11,11,.2) 75%),linear-gradient(0deg,rgba(11,11,11,.92),transparent 34%);}

/* ---- 5: Showcase — interactive Film+ (cursor lens, parallax, kinetic) ---- */
.r5 .heroshow{background:var(--ink);color:var(--paper);cursor:crosshair;}
.r5 .heroshow .shbase{position:absolute;inset:-24px;z-index:1;transform:translate(calc(var(--px,0)*-16px),calc(var(--py,0)*-16px)) scale(1.05);transition:transform .35s cubic-bezier(.2,.7,.2,1);}
/* lens: a second clip revealed only inside a circle that follows the cursor */
.r5 .heroshow .shlens{position:absolute;inset:-24px;z-index:2;opacity:0;transition:opacity .4s ease;-webkit-clip-path:circle(0px at var(--mx,50%) var(--my,50%));clip-path:circle(0px at var(--mx,50%) var(--my,50%));}
.r5 .heroshow.lenson .shlens{opacity:1;-webkit-clip-path:circle(160px at var(--mx) var(--my));clip-path:circle(160px at var(--mx) var(--my));}
.r5 .heroshow .shring{position:absolute;z-index:3;left:var(--mx,50%);top:var(--my,50%);width:330px;height:330px;margin:-165px 0 0 -165px;border:1px solid var(--gold);border-radius:50%;opacity:0;transition:opacity .4s ease;pointer-events:none;mix-blend-mode:screen;}
.r5 .heroshow.lenson .shring{opacity:.45;}
.r5 .heroshow .shscrim{z-index:4;background:linear-gradient(90deg,rgba(11,11,11,.92) 6%,rgba(11,11,11,.5) 42%,rgba(11,11,11,.12) 80%),linear-gradient(0deg,rgba(11,11,11,.9),transparent 38%);}
.r5 .heroshow .shvig{position:absolute;inset:0;z-index:4;pointer-events:none;box-shadow:inset 0 0 220px 60px rgba(0,0,0,.65);}
.r5 .heroshow .shwrap{position:relative;z-index:5;}
/* kinetic build-in on load */
.r5 .heroshow .hlock .kick{animation:shIn .7s .15s both;}
.r5 .heroshow .hlock h1{animation:shIn 1s .28s both;}
.r5 .heroshow .hlock .cta{animation:shIn .8s .5s both;}
@keyframes shIn{from{opacity:0;transform:translateY(26px);filter:blur(8px);}to{opacity:1;transform:none;filter:blur(0);}}
@media(hover:none){.r5 .heroshow{cursor:default;}.r5 .heroshow .shlens,.r5 .heroshow .shring{display:none;}}

/* hero variant picker */
.r5 .heropick{position:fixed;bottom:18px;right:18px;z-index:200;display:flex;gap:6px;background:rgba(11,11,11,.86);border:1px solid #3A3A36;padding:6px;backdrop-filter:blur(6px);}
.r5 .heropick button{font-family:var(--text);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--stone);background:transparent;border:1px solid transparent;padding:8px 12px;cursor:pointer;}
.r5 .heropick button.on{background:var(--gold);color:var(--ink);font-weight:600;}

.r5 .ticker{background:var(--ink);color:var(--stone);border-top:1px solid var(--ink-700);overflow:hidden;}
.r5 .ticker .row{display:flex;align-items:center;height:58px;width:max-content;animation:r5marq 32s linear infinite;}
@keyframes r5marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.r5 .ticker .it{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:15px;letter-spacing:.02em;color:#7C7A73;white-space:nowrap;padding:0 22px;}
.r5 .ticker .sep{color:var(--ink-700);}

/* SERVICES — dark band */
.r5 .svc{background:var(--ink);color:var(--paper);padding:128px 0;}
.r5 .svc .svctop{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:end;padding-bottom:48px;margin-bottom:40px;border-bottom:1px solid var(--ink-700);}
.r5 .svc .eyebrow{color:var(--gold);font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:18px;display:block;}
.r5 .svc .svctop h2{font-size:64px;}
.r5 .svc .svclede{color:var(--ink-300);font-size:17px;line-height:1.6;max-width:44ch;}
.r5 .svc .svcgrid{display:grid;grid-template-columns:repeat(3,1fr);}
.r5 .svc .svccell{padding:44px 38px 42px;border-left:1px solid var(--ink-700);border-top:1px solid var(--ink-700);}
.r5 .svc .svccell:nth-child(3n+1){border-left:none;padding-left:0;}
.r5 .svc .svccell:nth-child(-n+3){border-top:none;}
.r5 .svc .svccell .sn{font-family:var(--display);font-weight:800;font-size:13px;color:var(--gold-deep);letter-spacing:.05em;}
.r5 .svc .svccell h3{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;font-size:28px;margin:14px 0 10px;}
.r5 .svc .svccell p{color:var(--ink-300);font-size:14.5px;line-height:1.55;}
@media(max-width:880px){.r5 .svc .svctop{grid-template-columns:1fr;}.r5 .svc .svctop h2{font-size:48px;}.r5 .svc .svcgrid{grid-template-columns:1fr 1fr;}.r5 .svc .svccell:nth-child(3n+1){border-left:1px solid var(--ink-700);padding-left:30px;}.r5 .svc .svccell:nth-child(odd){border-left:none;padding-left:0;}.r5 .svc .svccell:nth-child(-n+2){border-top:none;}}

.r5 .work{padding:124px 0;border-bottom:1px solid var(--line);}
.r5 .work .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid var(--ink);padding-bottom:28px;margin-bottom:52px;gap:20px;flex-wrap:wrap;}
.r5 .work .head h2{font-size:72px;}
.r5 .work .head .sub{color:var(--ink-500);font-size:18px;margin-top:10px;}
.r5 .work .head .tabs{display:flex;gap:8px;}
.r5 .work .head .tabs button{font-family:var(--text);font-size:12px;letter-spacing:.12em;text-transform:uppercase;padding:8px 14px;border:1px solid var(--line);color:var(--ink-500);background:transparent;cursor:pointer;}
.r5 .work .head .tabs button.on{background:var(--ink);color:var(--paper);border-color:var(--ink);}
.r5 .feature{position:relative;background:var(--ink);color:var(--paper);border:1px solid var(--ink);aspect-ratio:21/8;display:flex;flex-direction:column;justify-content:space-between;padding:30px 34px;margin-bottom:18px;overflow:hidden;cursor:pointer;}
.r5 .feature .vid,.r5 .tile .vid{position:absolute;inset:0;z-index:0;}
.r5 .feature .shade{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(11,11,11,.92),rgba(11,11,11,.45) 55%,rgba(11,11,11,.2));}
.r5 .feature .ftop,.r5 .feature .fbot{position:relative;z-index:2;}
.r5 .feature .ftop{display:flex;justify-content:space-between;align-items:flex-start;}
.r5 .feature .play{width:62px;height:62px;border:1.5px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:20px;background:rgba(11,11,11,.35);}
.r5 .feature .ftag{color:var(--gold);font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:10px;}
.r5 .feature .fttl{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;font-size:58px;line-height:.9;}
.r5 .feature .fsub{color:var(--stone);margin-top:10px;font-size:16px;}
.r5 .grid12{display:grid;grid-template-columns:repeat(12,1fr);gap:18px;}
.r5 .tile{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:22px;min-height:250px;border:1px solid var(--ink);background:var(--ink);color:var(--paper);cursor:pointer;}
.r5 .tile .shade{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(11,11,11,.5),rgba(11,11,11,.35) 40%,rgba(11,11,11,.9));}
.r5 .tile .top,.r5 .tile .bot{position:relative;z-index:2;}
.r5 .tile .top{display:flex;justify-content:space-between;align-items:flex-start;}
.r5 .tile .pl{width:34px;height:34px;border:1.5px solid currentColor;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;opacity:.9;background:rgba(11,11,11,.3);}
.r5 .tile .idx{font-family:var(--display);font-weight:800;font-size:14px;opacity:.75;letter-spacing:.06em;}
.r5 .tile .name{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;line-height:.92;font-size:30px;}
.r5 .tile .foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--ink-700);}
.r5 .tile .metric{font-weight:600;font-size:13.5px;}

/* generic video card (used by portfolio variants 2-4) */
.r5 .vcard{position:relative;overflow:hidden;background:var(--ink);color:var(--paper);border:1px solid var(--ink);cursor:pointer;}
.r5 .vcard .vid{position:absolute;inset:0;z-index:0;}
.r5 .vcard .shade{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(11,11,11,.45),rgba(11,11,11,.25) 40%,rgba(11,11,11,.9));}
.r5 .vcard .pl{position:absolute;top:14px;right:14px;z-index:2;width:34px;height:34px;border:1.5px solid var(--paper);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;background:rgba(11,11,11,.3);}
.r5 .vcard .cap{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:16px 16px 14px;}
.r5 .vcard .cap .nm{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;line-height:.95;font-size:24px;}
.r5 .vcard .cap .row{display:flex;justify-content:space-between;align-items:center;margin-top:8px;}
.r5 .vcard .cap .mt{font-weight:600;font-size:12.5px;}
.r5 .vcard .cap .tg{font-size:10px;letter-spacing:.14em;text-transform:uppercase;border:1px solid currentColor;padding:3px 8px;}
.r5 .vcard .idx{position:absolute;top:14px;left:16px;z-index:2;font-family:var(--display);font-weight:800;font-size:13px;color:var(--gold);}

/* P2 featured + rail */
.r5 .pf2{display:grid;grid-template-columns:1.5fr 1fr;gap:18px;}
.r5 .pf2 .big{min-height:540px;}
.r5 .pf2 .big .cap .nm{font-size:44px;}
.r5 .pf2 .rail{display:flex;flex-direction:column;gap:12px;}
.r5 .pf2 .rrow{display:grid;grid-template-columns:132px 1fr auto;gap:16px;align-items:center;border:1px solid var(--line);padding:10px;cursor:pointer;background:var(--paper);}
.r5 .pf2 .rrow:hover{border-color:var(--gold);}
.r5 .pf2 .rthumb{position:relative;width:132px;aspect-ratio:16/9;overflow:hidden;background:var(--ink);}
.r5 .pf2 .rrow .rt{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.01em;font-size:19px;line-height:1;}
.r5 .pf2 .rrow .rm{color:var(--ink-500);font-size:12.5px;margin-top:5px;}
.r5 .pf2 .rrow .rar{color:var(--gold-deep);font-size:16px;}

/* P3 masonry wall */
.r5 .pf3{column-count:4;column-gap:16px;}
.r5 .pf3 .vcard{break-inside:avoid;margin-bottom:16px;width:100%;}
@media(max-width:1100px){.r5 .pf3{column-count:3;}}

/* P4 category carousels */
.r5 .pf4 .crow{margin-bottom:64px;}
.r5 .pf4 .crow:last-child{margin-bottom:0;}
.r5 .pf4 .ch{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:24px;}
.r5 .pf4 .ch h3{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;font-size:30px;}
.r5 .pf4 .ch .cc{color:var(--ink-500);font-size:12px;letter-spacing:.12em;text-transform:uppercase;}
.r5 .pf4 .track{display:flex;gap:14px;overflow-x:auto;padding-bottom:10px;}
.r5 .pf4 .ccard{flex:none;width:320px;aspect-ratio:16/9;}

/* portfolio picker */
.r5 .portpick{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;}
.r5 .portpick button{font-family:var(--text);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-500);background:transparent;border:1px solid var(--line);padding:8px 14px;cursor:pointer;}
.r5 .portpick button.on{background:var(--ink);color:var(--paper);border-color:var(--ink);}

/* Web / Video medium toggle */
.r5 .medium{display:inline-flex;border:1px solid var(--ink);}
.r5 .medium button{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:.02em;font-size:14px;padding:11px 24px;background:transparent;color:var(--ink);border:none;cursor:pointer;}
.r5 .medium button + button{border-left:1px solid var(--ink);}
.r5 .medium button.on{background:var(--ink);color:var(--paper);}

/* website card (browser-frame preview, links to the live site) */
.r5 .ccard.webcard{aspect-ratio:auto;}
.r5 .webcard{position:relative;display:flex;flex-direction:column;background:var(--paper);border:1px solid var(--line);cursor:pointer;transition:border-color .15s;}
.r5 .webcard:hover{border-color:var(--gold);}
.r5 .webcard .bar{display:flex;align-items:center;gap:7px;padding:11px 14px;border-bottom:1px solid var(--line);background:var(--paper-alt);}
.r5 .webcard .bar .d{width:9px;height:9px;border-radius:50%;background:#CFCBC3;}
.r5 .webcard .bar .u{margin-left:8px;font-size:11px;color:var(--ink-500);letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.r5 .webcard .body{padding:24px;flex:1;display:flex;flex-direction:column;justify-content:space-between;min-height:150px;}
.r5 .webcard .body .nm{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;font-size:30px;line-height:.95;}
.r5 .webcard .body .row{display:flex;justify-content:space-between;align-items:center;margin-top:18px;}
.r5 .webcard .body .tg{font-size:10px;letter-spacing:.14em;text-transform:uppercase;border:1px solid var(--ink);padding:3px 8px;}
.r5 .webcard .body .open{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:13px;color:var(--gold-deep);}

.r5 .ways{padding:124px 0;border-bottom:1px solid var(--line);background:var(--paper);}
.r5 .ways .wh{text-align:center;max-width:46ch;margin:0 auto 48px;}
.r5 .ways .wh .eyebrow{color:var(--gold-deep);font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:16px;display:block;}
.r5 .ways .wh h2{font-size:74px;}
.r5 .ways .wh p{color:var(--ink-500);font-size:18px;line-height:1.5;margin-top:18px;}
.r5 .twogrid{display:grid;grid-template-columns:1fr 1fr;gap:22px;}
.r5 .panel{border:1px solid var(--line);background:var(--paper-alt);padding:34px 34px 30px;display:flex;flex-direction:column;}
.r5 .panel.feat{background:var(--ink);color:var(--paper);border-color:var(--ink);}
.r5 .panel .ptop{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.r5 .panel .pe{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-500);}
.r5 .panel.feat .pe{color:var(--gold);}
.r5 .panel .pmost{font-size:10px;letter-spacing:.14em;text-transform:uppercase;background:var(--gold);color:var(--ink);padding:3px 8px;font-weight:600;}
.r5 .panel h3{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;font-size:42px;line-height:.95;margin-bottom:22px;}
.r5 .panel .step{display:grid;grid-template-columns:30px 1fr;gap:16px;padding:16px 0;border-top:1px solid var(--line);}
.r5 .panel.feat .step{border-color:var(--ink-700);}
.r5 .panel .step .sn{font-family:var(--display);font-weight:800;font-size:15px;color:var(--gold-deep);}
.r5 .panel.feat .step .sn{color:var(--gold);}
.r5 .panel .step .sl{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.01em;font-size:17px;}
.r5 .panel .step .sb{font-size:14px;color:var(--ink-500);line-height:1.5;margin-top:5px;}
.r5 .panel.feat .step .sb{color:var(--ink-300);}
.r5 .panel .pcta{margin-top:24px;}

/* Two Ways — interactive tabs + horizontal timeline */
.r5 .w1{max-width:980px;margin:0 auto;}
.r5 .w1tabs{display:flex;justify-content:center;margin-bottom:34px;}
.r5 .w1tabs .seg{display:inline-flex;border:1px solid var(--ink);}
.r5 .w1tabs button{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:15px;padding:12px 28px;background:transparent;color:var(--ink);border:none;cursor:pointer;}
.r5 .w1tabs button + button{border-left:1px solid var(--ink);}
.r5 .w1tabs button.on{background:var(--gold);color:var(--ink);}
.r5 .w1 .w1head{text-align:center;margin-bottom:30px;}
.r5 .w1 .w1head h3{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;font-size:46px;}
.r5 .w1steps{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--line);}
.r5 .w1steps .st{padding:24px 20px;border-left:1px solid var(--line);}
.r5 .w1steps .st:first-child{border-left:none;}
.r5 .w1steps .st .n{font-family:var(--display);font-weight:800;font-size:34px;color:var(--gold-deep);line-height:1;}
.r5 .w1steps .st .l{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:16px;margin:12px 0 8px;letter-spacing:-.01em;}
.r5 .w1steps .st .b{font-size:13px;color:var(--ink-500);line-height:1.5;}
.r5 .w1 .w1cta{text-align:center;margin-top:30px;}
@media(max-width:880px){.r5 .w1steps{grid-template-columns:1fr 1fr;}}

.r5 .why{background:var(--ink);color:var(--paper);padding:124px 0;}
.r5 .why .eyebrow{color:var(--gold);font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:18px;display:block;}
.r5 .why h2{font-size:72px;margin-bottom:56px;}
.r5 .why .grid{display:grid;grid-template-columns:repeat(4,1fr);}
.r5 .why .cell{padding:0 26px;border-left:1px solid var(--ink-700);}
.r5 .why .cell:first-child{border-left:none;padding-left:0;}
.r5 .why .cell .k{color:var(--ink-300);font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:14px;}
.r5 .why .cell .v{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:30px;line-height:.95;}
.r5 .why .cell .d{color:var(--ink-300);font-size:14.5px;line-height:1.5;margin-top:14px;}

.r5 .voices{background:var(--paper-alt);padding:124px 0;border-bottom:1px solid var(--line);}
.r5 .voices h2{font-size:44px;margin-bottom:56px;}
.r5 .voices .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.r5 .voices .q{background:var(--paper);border:1px solid var(--line);padding:30px;display:flex;flex-direction:column;justify-content:space-between;min-height:300px;}
.r5 .voices .q .quote{font-size:19px;line-height:1.45;font-weight:500;}
.r5 .voices .q .metric{font-family:var(--display);font-weight:800;text-transform:uppercase;color:var(--gold-deep);font-size:16px;margin:20px 0;line-height:1;}
.r5 .voices .q .who{border-top:1px solid var(--line);padding-top:14px;}
.r5 .voices .q .who .nm{font-weight:700;font-size:15px;}
.r5 .voices .q .who .co{color:var(--ink-500);font-size:13px;margin-top:2px;}

.r5 .close{position:relative;overflow:hidden;background:var(--ink);color:var(--paper);padding:118px 0;}
.r5 .close .mono{position:absolute;width:600px;height:600px;right:-130px;top:-70px;color:var(--gold);opacity:.12;}
.r5 .close .inner{position:relative;z-index:2;}
.r5 .close .kicker{color:var(--stone);margin-bottom:24px;display:block;}
.r5 .close h2{font-size:120px;max-width:12ch;}
.r5 .close .ctarow{display:flex;align-items:center;gap:22px;margin-top:40px;flex-wrap:wrap;}
.r5 .close .ctarow .note{color:var(--stone);font-size:15px;max-width:32ch;}

.r5 .foot{background:var(--ink);color:var(--paper);padding:58px 0 40px;border-top:1px solid var(--ink-700);}
.r5 .foot .top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:40px;border-bottom:1px solid var(--ink-700);gap:30px;flex-wrap:wrap;}
.r5 .foot .brand{display:flex;align-items:center;gap:13px;}
.r5 .foot .brand .mk{width:30px;height:30px;color:var(--paper);}
.r5 .foot .brand .wm{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:16px;}
.r5 .foot .cols{display:flex;gap:64px;}
.r5 .foot .col h4{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-300);margin-bottom:14px;}
.r5 .foot .col a{display:block;color:var(--paper);text-decoration:none;font-size:15px;margin-bottom:9px;}
.r5 .foot .base{display:flex;justify-content:space-between;align-items:center;padding-top:24px;gap:20px;flex-wrap:wrap;}
.r5 .foot .base .sig{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:15px;}
.r5 .foot .base .sig b{color:var(--gold);}
.r5 .foot .base .fine{color:var(--ink-300);font-size:13px;}

.r5 .modal{position:fixed;inset:0;z-index:1000;background:rgba(8,8,7,.94);display:flex;align-items:center;justify-content:center;padding:32px;}
.r5 .modal .box{width:min(1040px,100%);}
.r5 .modal .vwrap{position:relative;width:100%;aspect-ratio:16/9;background:#000;border:1px solid var(--ink-700);}
.r5 .modal .vwrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}
.r5 .modal .mhead{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px;color:var(--paper);}
.r5 .modal .mhead .mt{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:24px;letter-spacing:-.01em;}
.r5 .modal .mhead .mc{background:none;border:1px solid #4A4843;color:var(--paper);width:40px;height:40px;font-size:18px;cursor:pointer;}

@media(max-width:980px){
  .r5 .inner2{grid-template-columns:1fr;}
  .r5 .cols2{display:none;}
  .r5 .hlock h1{font-size:52px;}
  .r5 .hlock.center h1{font-size:54px;}
  .r5 .lrtile{width:280px;}
  .r5 .twogrid{grid-template-columns:1fr;}
  .r5 .why .grid{grid-template-columns:1fr 1fr;gap:30px 0;}
  .r5 .voices .grid{grid-template-columns:1fr;}
  .r5 .tile,.r5 .feature .fttl{}
  .r5 [style*="grid-column"]{grid-column:span 12 !important;}
  .r5 .close h2{font-size:64px;}
  .r5 .work .head h2{font-size:48px;}
}
`;

// Big landscape clip pool so the hero reel reads as VOLUME and stays fresh.
const REEL_POOL = (() => {
  const seen = new Set();
  const out = [];
  const push = (id, client) => { if (id && !seen.has(id)) { seen.add(id); out.push({ id, client }); } };
  FILMS.forEach((f) => push(f.id, f.client));
  VIDEO_ROWS.forEach((r) => r.items.forEach((it) => push(it.id, it.t)));
  return out;
})();

// Fisher-Yates. Browser runtime (Math.random is fine here) -> fresh order each load.
function shuffle(arr) {
  const x = [...arr];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

// A horizontal "running reel": shuffled clips ride a center line, fading in/out at the edges.
function LineReel({ count = 7, onPlay }) {
  const reel = useMemo(() => shuffle(REEL_POOL).slice(0, Math.min(count, REEL_POOL.length)), [count]);
  const tiles = [...reel, ...reel];
  return (
    <div className="linereel"><div className="lrtrack">
      {tiles.map((c, i) => (
        <div className="lrtile" key={i} onClick={() => onPlay && onPlay(c)}>
          <LazyGumlet id={c.id} eager />
        </div>
      ))}
    </div></div>
  );
}

// A single big film that rotates through random clips with a true crossfade.
// Key to a clean transition: the NEXT clip is loaded into the hidden layer a full
// cycle BEFORE it is revealed, so it is already playing (no poster still) when it
// fades in. We only swap a layer's clip AFTER it has finished fading out.
function RotatingFilm({ intervalMs = 7000, fadeMs = 1600 }) {
  const queue = useMemo(() => shuffle(REEL_POOL), []);
  const [showA, setShowA] = useState(true);
  const [a, setA] = useState(queue[0]?.id);
  const [b, setB] = useState(queue[1] ? queue[1].id : queue[0]?.id);
  const showARef = useRef(true);
  const posRef = useRef(1); // index of the clip currently sitting in the hidden layer
  useEffect(() => {
    if (queue.length < 2) return;
    let pending;
    const id = setInterval(() => {
      // 1) crossfade to the hidden layer (it has been playing, invisible, for a cycle)
      showARef.current = !showARef.current;
      setShowA(showARef.current);
      // 2) after the fade completes, quietly load the next clip into the now-hidden
      //    layer so it has a full cycle to start before its turn.
      pending = setTimeout(() => {
        posRef.current = (posRef.current + 1) % queue.length;
        const nextId = queue[posRef.current].id;
        if (showARef.current) setB(nextId); else setA(nextId);
      }, fadeMs + 150);
    }, intervalMs);
    return () => { clearInterval(id); clearTimeout(pending); };
  }, [queue, intervalMs, fadeMs]);
  return (
    <div className="rfilm">
      <div className={'rlayer' + (showA ? ' on' : '')}>{a && <LazyGumlet id={a} eager poster="#0B0B0B" />}</div>
      <div className={'rlayer' + (!showA ? ' on' : '')}>{b && <LazyGumlet id={b} eager poster="#0B0B0B" />}</div>
    </div>
  );
}

// Showcase hero: the Film hero leveled up into an interactive piece that proves we
// build web. A cursor "lens" reveals a different clip; the film parallax-drifts with
// the mouse; the headline builds in kinetically. Base reel still rotates + stays fresh.
function ShowcaseHero({ children }) {
  const ref = useRef(null);
  const lensId = useMemo(() => {
    const s = shuffle(REEL_POOL);
    return s[0]?.id;
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', x + 'px');
        el.style.setProperty('--my', y + 'px');
        el.style.setProperty('--px', ((x / r.width) - 0.5).toFixed(3));
        el.style.setProperty('--py', ((y / r.height) - 0.5).toFixed(3));
      });
      el.classList.add('lenson');
    };
    const onLeave = () => el.classList.remove('lenson');
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <header className="hero heroshow" ref={ref}>
      <div className="shbase"><RotatingFilm /></div>
      <div className="shlens">{lensId && <LazyGumlet id={lensId} eager poster="#0B0B0B" />}</div>
      <div className="shring" />
      <div className="scrim shscrim" />
      <div className="shvig" />
      <div className="wrap shwrap">{children}</div>
    </header>
  );
}

export default function HomeR5Preview() {
  const [tab, setTab] = useState('All');
  const [video, setVideo] = useState(null);
  const [hero, setHero] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const n = parseInt(new URLSearchParams(window.location.search).get('hero'), 10);
    return n >= 1 && n <= 5 ? n : 5;
  });
  const portrait = useMemo(() => shuffle(DECK_REELS), []);
  const [medium, setMedium] = useState(() => {
    if (typeof window === 'undefined') return 'Video';
    return new URLSearchParams(window.location.search).get('med') === 'web' ? 'Web' : 'Video';
  });
  const rows = medium === 'Web' ? WEB_ROWS : VIDEO_ROWS;
  const [wtab, setWtab] = useState('In person');
  const WAY_ONLINE = { eyebrow: 'Online', title: 'Hire us online.', steps: ONLINE_STEPS, cta: 'Send your files' };
  const WAY_PERSON = { eyebrow: 'In person', title: 'Hire us in person.', steps: PERSON_STEPS, cta: 'Book a visit' };
  const wActive = wtab === 'Online' ? WAY_ONLINE : WAY_PERSON;

  const HeroLockup = ({ center = false, light = false }) => (
    <div className={'hlock' + (center ? ' center' : '') + (light ? ' light' : '')}>
      <span className="kick"><span className="ledot" /> Video · Web · Ads</span>
      <h1 className="disp">We make companies <span className="gold">impossible to ignore</span><span className="dot" /></h1>
      <div className="cta">
        <a className="btn gold" href="#contact">Start a project ↗</a>
        <a className={'btn ' + (light ? 'ghost-ink' : 'ghost-light')} href="#work">See our work</a>
      </div>
    </div>
  );

  return (
    <div className="r5">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="nav"><div className="wrap row">
        <div className="brand"><BrandMark kind="mono" className="mk mark" /><span className="wm">Ahead of Market</span></div>
        <div className="links kicker">
          <a href="#work">Work</a><a href="#hire">How to hire</a><a href="#why">Why us</a><a href="#contact">Contact</a>
        </div>
        <a className="btn gold" href="#contact">Start a project ↗</a>
      </div></nav>

      {/* HERO — 4 new directions: running reel + trimmed text. Switch bottom-right. */}
      {/* 1 — Line, light: blank ivory, big clips fade across a center line, crisp text above */}
      {hero === 1 && (
        <header className="hero heroline light">
          <div className="wrap hltop"><HeroLockup center light /></div>
          <div className="lineband">
            <LineReel count={7} onPlay={(c) => setVideo({ id: c.id, client: c.client })} />
          </div>
        </header>
      )}
      {/* 2 — Line, dark: same running reel on obsidian, cinematic */}
      {hero === 2 && (
        <header className="hero heroline dark">
          <div className="wrap hltop"><HeroLockup center /></div>
          <div className="lineband">
            <LineReel count={7} onPlay={(c) => setVideo({ id: c.id, client: c.client })} />
          </div>
        </header>
      )}
      {/* 3 — Columns refined: twin marquee, bigger tiles, more air, text left */}
      {hero === 3 && (
        <header className="hero herocols">
          <div className="wrap inner2">
            <HeroLockup />
            <div className="cols2">
              <div className="c2 up">
                {[...portrait.slice(0, 4), ...portrait.slice(0, 4)].map((r, i) => (
                  <div className="c2tile" key={i} onClick={() => setVideo({ id: r.id, client: r.client })}><LazyGumlet id={r.id} eager portrait /></div>
                ))}
              </div>
              <div className="c2 down">
                {[...portrait.slice(4, 8), ...portrait.slice(4, 8)].map((r, i) => (
                  <div className="c2tile" key={i} onClick={() => setVideo({ id: r.id, client: r.client })}><LazyGumlet id={r.id} eager portrait /></div>
                ))}
              </div>
            </div>
          </div>
        </header>
      )}
      {/* 4 — Film: one big film rotating through random clips, minimal text */}
      {hero === 4 && (
        <header className="hero herofilm">
          <RotatingFilm />
          <div className="scrim v3scrim" />
          <div className="wrap"><HeroLockup /></div>
        </header>
      )}
      {/* 5 — Showcase: interactive Film+ (cursor lens reveal, parallax, kinetic text) */}
      {hero === 5 && (
        <ShowcaseHero><HeroLockup /></ShowcaseHero>
      )}
      <div className="heropick">
        {['Line light', 'Line dark', 'Columns', 'Film', 'Showcase'].map((l, i) => (
          <button key={l} className={hero === i + 1 ? 'on' : ''} onClick={() => setHero(i + 1)}>{i + 1} {l}</button>
        ))}
      </div>

      {/* TICKER */}
      <div className="ticker"><div className="row">
        {[...TICKER, ...TICKER].map((t, i) => (
          <React.Fragment key={i}><span className="it">{t}</span><span className="sep">/</span></React.Fragment>
        ))}
      </div></div>

      {/* SERVICES — dark, who we are + what we do */}
      <section className="svc"><div className="wrap">
        <div className="svctop">
          <div>
            <span className="eyebrow">What we do</span>
            <h2 className="disp">A small team<br />that does <span className="gold">a lot</span><span className="dot" /></h2>
          </div>
          <p className="svclede">No big agency and no account managers. The people who make the work are the people you talk to. That keeps us fast, and it lets us take on more than our size would suggest.</p>
        </div>
        <div className="svcgrid">
          {SERVICES.map((s) => (
            <div className="svccell" key={s.n}>
              <span className="sn">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </div></section>

      {/* PORTFOLIO — category rows, Web/Video toggle, Construction first */}
      <section className="work" id="work"><div className="wrap">
        <div className="head">
          <div>
            <h2 className="disp">Recent work<span className="dot" /></h2>
            <div className="sub">A few projects we shipped. Switch between video and websites.</div>
          </div>
          <div className="medium">
            <button className={medium === 'Video' ? 'on' : ''} onClick={() => setMedium('Video')}>Video</button>
            <button className={medium === 'Web' ? 'on' : ''} onClick={() => setMedium('Web')}>Web</button>
          </div>
        </div>

        <div className="pf4">
          {rows.map((r) => (
            <div className="crow" key={r.cat}>
              <div className="ch"><h3>{r.cat}</h3><span className="cc">{r.items.length} {medium === 'Web' ? 'sites' : 'films'}</span></div>
              <div className="track">
                {medium === 'Web'
                  ? r.items.map((p) => (
                      <div className="ccard webcard" key={p.t} onClick={() => window.open(p.url, '_blank', 'noopener')}>
                        <div className="bar"><span className="d" /><span className="d" /><span className="d" /><span className="u">{p.domain}</span></div>
                        <div className="body">
                          <div className="nm">{p.t}</div>
                          <div className="row"><span className="tg">{p.tag}</span><span className="open">View live ↗</span></div>
                        </div>
                      </div>
                    ))
                  : r.items.map((p) => (
                      <div className="vcard ccard" key={p.t} onClick={() => p.slug ? window.location.assign(`/work/${p.slug}`) : setVideo({ id: p.id, client: p.t })}>
                        <LazyGumlet id={p.id} className="vid" />
                        <div className="shade" /><span className="pl">▶</span>
                        <div className="cap"><div className="nm">{p.t}</div>
                          <div className="row"><span className="mt">{p.tag}</span></div></div>
                      </div>
                    ))}
              </div>
            </div>
          ))}
        </div>
      </div></section>

      {/* TWO WAYS */}
      <section className="ways" id="hire"><div className="wrap">
        <div className="wh">
          <span className="eyebrow">How to hire us</span>
          <h2 className="disp">Two ways. <span className="gold">Pick one</span><span className="dot" /></h2>
          <p>You do not need a meeting to start. Come shake hands with us, or send a few files and never visit. Both work.</p>
        </div>

        <div className="w1">
          <div className="w1tabs"><div className="seg">
            <button className={wtab === 'In person' ? 'on' : ''} onClick={() => setWtab('In person')}>In person</button>
            <button className={wtab === 'Online' ? 'on' : ''} onClick={() => setWtab('Online')}>Online</button>
          </div></div>
          <div className="w1head"><h3 className="disp">{wActive.title}</h3></div>
          <div className="w1steps">
            {wActive.steps.map((s) => (
              <div className="st" key={s[0]}><div className="n">{s[0]}</div><div className="l">{s[1]}</div><div className="b">{s[2]}</div></div>
            ))}
          </div>
          <div className="w1cta"><a className="btn gold" href="#contact">{wActive.cta} ↗</a></div>
        </div>
      </div></section>

      {/* WHY IT WORKS */}
      <section className="why" id="why"><div className="wrap">
        <span className="eyebrow">Why us</span>
        <h2 className="disp">Why it <span className="gold">works</span><span className="dot" /></h2>
        <div className="grid">
          {TRUST.map((m) => (
            <div className="cell" key={m.k}><div className="k">{m.k}</div><div className="v disp">{m.v}</div><div className="d">{m.d}</div></div>
          ))}
        </div>
      </div></section>

      {/* TESTIMONIALS */}
      <section className="voices"><div className="wrap">
        <h2 className="disp">What clients say<span className="dot" /></h2>
        <div className="grid">
          {VOICES.map((v) => (
            <div className="q" key={v.n}>
              <div className="quote">{'“'}{v.q}{'”'}</div>
              <div><div className="metric">{v.m}</div>
                <div className="who"><div className="nm">{v.n}</div><div className="co">{v.c}</div></div></div>
            </div>
          ))}
        </div>
      </div></section>

      {/* CLOSING */}
      <section className="close" id="contact">
        <BrandMark kind="mono" className="mono mark" />
        <div className="wrap inner">
          <span className="kicker">[ Get in touch ]</span>
          <h2 className="disp">Tell us <span className="gold">what you need</span><span className="dot" /></h2>
          <div className="ctarow">
            <a className="btn gold" href="mailto:hello@aom-inhouse.com">Start a project ↗</a>
            <span className="note">Send a few files or book a call. We reply within 24 hours.</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot"><div className="wrap">
        <div className="top">
          <div className="brand"><BrandMark kind="mono" className="mk mark" /><span className="wm">Ahead of Market</span></div>
          <div className="cols">
            <div className="col"><h4>Studio</h4><a href="#work">Work</a><a href="#hire">How to hire</a><a href="#why">Why us</a></div>
            <div className="col"><h4>Connect</h4><a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a><a href="tel:6023732164">602 373 2164</a><a href="#">Instagram</a></div>
          </div>
        </div>
        <div className="base">
          <div className="sig">A video and web studio<b>.</b></div>
          <div className="fine">© 2026 Ahead of Market. All rights reserved.</div>
        </div>
      </div></footer>

      {/* VIDEO MODAL */}
      {video && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setVideo(null); }}>
          <div className="box">
            <div className="mhead">
              <span className="mt">{video.client || video.t}</span>
              <button className="mc" onClick={() => setVideo(null)} aria-label="Close">×</button>
            </div>
            <div className="vwrap">
              <iframe src={playerEmbed(video.id)} title={video.client || video.t} allow="autoplay; fullscreen; encrypted-media" allowFullScreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
