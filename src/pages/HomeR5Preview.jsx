import React, { useState, useEffect, useRef, useCallback } from 'react';
import LazyGumlet from '../components/home/LazyGumlet';
import BrandMark from '../components/home/BrandMark';

// Mounted at /r5 for review; promote to / when approved. Mission: aheadofmarket.com:home (R18).
// "The reel" — Patrik's Glitch&Grit-structure rebuild (target: glitchandgrit.com): the whole
// homepage is a full-viewport, scroll-snapped case reel. R18 adds the target's signature
// counter-scroll: the media halves live in a fixed backdrop of two columns, the left column
// translating up with scroll while the right column (stacked in reverse) translates down, so
// each slide's pair sweeps in from opposite directions and still lands paired at every snap
// point. Slides carry only the type; slides without media read as the sides sweeping to black.
// Rendered unmistakably AOM: obsidian/ivory with champagne-gold as the only accent, gold square
// period bonded to every headline, corner chrome spells AHEAD / OF / MARKET, every media panel
// is a frame of our real client work. R15 is frozen at /versions/cinematic-glass. Copy is
// Patrik's narrative from R15, verbatim — the copy IS the story.

const PORTFOLIO = [
  { t: 'Lagos White Party', id: '698a596eaec3d4e420c22a9a', tag: 'Event' },
  { t: 'Lagos Recap', id: '698a5946873071aec5c96163', tag: 'Event' },
  { t: 'Nook 10 Year', id: '698a5a8b873071aec5c99c6f', tag: 'Brand' },
  { t: "PA'LA x HARUMI", id: '698a5391fc23d3d76fa7306c', tag: 'Brand' },
  { t: 'Journey to Gary Vee', id: '698a6296fc23d3d76fa8d992', tag: 'Doc' },
  { t: 'Noble Real Estate', id: '698a5b86fc23d3d76fa82ece', tag: 'Brand' },
  { t: 'Virtu Hospitality', id: '698a5ef5fc23d3d76fa87ef4', tag: 'Brand' },
  { t: 'United Food Bank', id: '698a5fcdfc23d3d76fa893b8', tag: 'Nonprofit' },
];

const HERO_REEL = '698a6296fc23d3d76fa8d992'; // Journey to Gary Vee, strongest doc footage
const FILM_REEL = '698a5ef5fc23d3d76fa87ef4'; // Virtu Hospitality
const BILL_REEL = '698a5fcdfc23d3d76fa893b8'; // United Food Bank, under the billboard line
const PALA_REEL = '698a5391fc23d3d76fa7306c'; // PA'LA x HARUMI
const NOOK_REEL = '698a5a8b873071aec5c99c6f'; // Nook 10 Year, clean frame for small screens

const N_SLIDES = 14;

const embed = id => `https://play.gumlet.io/embed/${id}?autoplay=true&preload=false&loop=false&background=false&disable_player_controls=false`;
const poster = (id, w = 1200) => `https://video.gumlet.io/697678222b8b17fbb707acef/${id}/thumbnail-1-0.png?format=auto&w=${w}`;

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
.r17 {
  --ink:#060606; --ink-2:#0B0B0A; --paper:#F6F6F4;
  --mut:rgba(246,246,244,.66); --dim:rgba(246,246,244,.44);
  --line:rgba(255,255,255,.14); --gold:#C4A46A; --gold-deep:#A8884C;
  --fx:'Inter',system-ui,Helvetica,Arial,sans-serif;
  --fd:'Inter Tight','Inter',system-ui,Helvetica,Arial,sans-serif;
  --pad:clamp(1.25rem,4vw,3.5rem);
  position:fixed; inset:0; overflow-y:auto; overflow-x:hidden;
  scroll-snap-type:y mandatory; scroll-behavior:smooth;
  font-family:var(--fx); color:var(--paper); background:var(--ink);
  font-size:16px; line-height:1.6;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
}
.r17 *, .r17 *::before, .r17 *::after { box-sizing:border-box; margin:0; padding:0; }
.r17 a { color:inherit; text-decoration:none; }
.r17 button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.r17 img { display:block; max-width:100%; }
.r17 a:focus-visible, .r17 button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* the signature: square gold period, bonded to the last word */
.r17 .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* ─── fixed corner chrome ─── */
.r17 .chrome { position:fixed; left:0; right:0; z-index:220; display:flex; justify-content:space-between; align-items:center; padding:0 var(--pad); pointer-events:none; }
.r17 .chrome.top { top:1.1rem; }
.r17 .chrome.bot { bottom:calc(1.1rem + env(safe-area-inset-bottom)); }
.r17 .chrome span, .r17 .chrome a { pointer-events:auto; font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; text-shadow:0 1px 14px rgba(0,0,0,.75); }
.r17 .chrome a { transition:color .15s; }
.r17 .chrome a:hover { color:var(--gold); }
.r17 .chrome .mid { position:absolute; left:50%; transform:translateX(-50%); }
.r17 .chrome .brand { color:var(--paper); }
.r17 .chrome .brand .sq { width:.5em; height:.5em; margin-left:.45em; vertical-align:baseline; }

/* ─── counter-scroll backdrop: two clipped windows, each holding a column of
   viewport-height panels. Left column rides up with scroll; right column is
   stacked in REVERSE and rides down, so pairs still meet at every snap. ─── */
.r17 .bk { position:fixed; inset:0; z-index:0; pointer-events:none; }
.r17 .bk-win { position:absolute; overflow:hidden; }
.r17 .bk-win.l { left:0; top:0; width:50%; height:100%; }
.r17 .bk-win.r { right:0; top:0; width:50%; height:100%; }
.r17 .bk-col { position:absolute; left:0; top:0; width:100%; will-change:transform; }
.r17 .bk-col.r { transform:translateY(calc(-13 * 100svh)); }
.r17 .bk-panel { position:relative; width:100%; height:100svh; overflow:hidden; background:var(--ink); }
.r17 .bk-panel::after { content:''; position:absolute; inset:0; background:rgba(4,4,4,.44); z-index:2; }
.r17 .bk-panel > img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
@media(max-width:860px){
  .r17 .bk-win.l { width:100%; height:50%; }
  .r17 .bk-win.r { left:0; right:auto; top:50%; width:100%; height:50%; }
  .r17 .bk-col.r { transform:translateY(calc(-13 * 50svh)); }
  .r17 .bk-panel { height:50svh; }
}

/* hero live reels: poster paints first, iframe loads over it; poster-only on
   small screens (Gumlet chrome shows at half-height) */
.r17 .bk-panel .pstr { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; }
.r17 .bk-panel .vid { position:absolute; inset:0; z-index:1; }
@media(max-width:860px){ .r17 .bk-panel .vid { display:none; } }

/* ghost-type texture panel (solid panel, outlined repeating line) */
.r17 .ghostpanel { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; gap:.4em; overflow:hidden; }
.r17 .ghostpanel span {
  font-family:var(--fd); font-weight:800; text-transform:uppercase; white-space:nowrap;
  font-size:clamp(2.2rem,5.5vw,4.6rem); line-height:1; letter-spacing:-.01em;
  color:transparent; -webkit-text-stroke:1px rgba(246,246,244,.22); text-align:center;
}
.r17 .ghostpanel span:nth-child(odd) { transform:translateX(-4%); }
.r17 .ghostpanel span:nth-child(even) { transform:translateX(4%); }
.r17 .ghostpanel span.solid { color:rgba(196,164,106,.5); -webkit-text-stroke:0; }

/* ─── slides: type only, transparent over the backdrop ─── */
.r17 .slide {
  position:relative; height:100svh; scroll-snap-align:start; scroll-snap-stop:always;
  overflow:hidden; background:transparent; z-index:1;
  display:flex; align-items:center; justify-content:center;
}

/* center stack */
.r17 .stack { position:relative; z-index:3; display:flex; flex-direction:column; align-items:center; text-align:center; padding:0 var(--pad); max-width:100%; }
.r17 .tags { display:flex; flex-direction:column; gap:.28rem; margin-bottom:1.1rem; }
.r17 .tags span { font-size:.68rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:var(--gold); text-shadow:0 1px 12px rgba(0,0,0,.7); }
.r17 .title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.7rem,9.2vw,9.2rem); line-height:.9; letter-spacing:-.02em;
  text-shadow:0 3px 44px rgba(0,0,0,.55);
}
.r17 .title .row { display:block; }
.r17 .title .gold { color:var(--gold); }
.r17 .sub { margin-top:1.3rem; font-size:clamp(.95rem,1.5vw,1.12rem); color:var(--paper); opacity:.9; max-width:52ch; text-shadow:0 1px 16px rgba(0,0,0,.7); }
.r17 .stat { margin-top:.55rem; font-size:.72rem; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:var(--gold); text-shadow:0 1px 12px rgba(0,0,0,.7); }
.r17 .view { margin-top:1.5rem; display:inline-block; font-size:.74rem; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:var(--gold); transition:color .15s; }
.r17 .view:hover { color:var(--paper); }
.r17 .btn-gold {
  margin-top:1.6rem; display:inline-block; background:var(--gold); color:var(--ink);
  font-size:.9rem; font-weight:600; padding:.9rem 2.1rem; border-radius:10px; transition:background .18s;
}
.r17 .btn-gold:hover { background:var(--gold-deep); }

/* reveal: rows rise, tags/sub fade */
.r17 .rv { opacity:0; transform:translateY(26px); transition:opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1); }
.r17 .slide.in .rv { opacity:1; transform:none; }
.r17 .slide.in .rv.d1 { transition-delay:.08s; } .r17 .slide.in .rv.d2 { transition-delay:.16s; }
.r17 .slide.in .rv.d3 { transition-delay:.24s; } .r17 .slide.in .rv.d4 { transition-delay:.34s; }

/* neither strike */
.r17 .strike { position:relative; display:inline-block; }
.r17 .strike i { position:absolute; left:-.05em; right:-.05em; top:52%; height:.075em; background:var(--gold); transform:scaleX(0); transform-origin:left center; transition:transform .6s cubic-bezier(.16,1,.3,1) .7s; }
.r17 .slide.in .strike i { transform:scaleX(1); }

/* ghost monogram / wordmark backdrops */
.r17 .ghost-mark { position:absolute; inset:0; display:flex !important; align-items:center; justify-content:center; z-index:1; color:rgba(196,164,106,.09); }
.r17 .ghost-mark svg { width:min(72vh,72vw); height:auto; display:block; margin:0 auto; }
.r17 .ghost-word {
  position:absolute; z-index:1; left:50%; top:50%; transform:translate(-50%,-50%);
  font-family:var(--fd); font-weight:800; text-transform:uppercase; white-space:nowrap;
  font-size:clamp(6rem,22vw,22rem); line-height:1; letter-spacing:-.02em;
  color:transparent; -webkit-text-stroke:1.5px rgba(246,246,244,.1); pointer-events:none;
}

/* two parts lists */
.r17 .parts-head { font-size:.72rem; font-weight:700; letter-spacing:.24em; text-transform:uppercase; color:var(--gold); margin-bottom:1rem; }
.r17 .parts-list { list-style:none; display:flex; flex-direction:column; gap:.5rem; }
.r17 .parts-list li { font-size:clamp(.85rem,1.3vw,1.02rem); color:var(--mut); }
.r17 .parts-col { position:absolute; z-index:3; top:0; height:100%; width:50%; display:flex; flex-direction:column; justify-content:flex-end; padding:0 var(--pad) 16svh; }
.r17 .parts-col.l { left:0; align-items:flex-start; text-align:left; }
.r17 .parts-col.r { right:0; align-items:flex-end; text-align:right; }
@media(max-width:860px){
  .r17 .parts-col { width:100%; }
  .r17 .parts-col.l { top:0; height:50%; justify-content:flex-start; padding:calc(3.4rem + 2svh) var(--pad) 0; }
  .r17 .parts-col.r { top:50%; height:50%; justify-content:flex-end; padding:0 var(--pad) calc(3.4rem + 2svh); }
  .r17 .slide-parts .title { font-size:clamp(2.2rem,8vw,4.5rem); }
}

/* work mosaic */
.r17 .mosaic { position:absolute; inset:0; display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:1fr 1fr; }
.r17 .tile { position:relative; overflow:hidden; background:var(--ink-2); border:none; padding:0; }
.r17 .tile img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:.55; transform:scale(1.04); transition:opacity .4s, transform .6s cubic-bezier(.16,1,.3,1); }
.r17 .tile:hover img { opacity:.95; transform:scale(1.01); }
.r17 .tile .tl { position:absolute; left:.9rem; bottom:.8rem; z-index:2; font-size:.62rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--paper); text-shadow:0 1px 10px rgba(0,0,0,.8); opacity:0; transition:opacity .3s; }
.r17 .tile:hover .tl { opacity:1; }
.r17 .mosaic-stack { pointer-events:none; }
.r17 .mosaic-stack .view { pointer-events:auto; }
@media(max-width:860px){ .r17 .mosaic { grid-template-columns:1fr 1fr; grid-template-rows:repeat(4,1fr); } }

/* voices */
.r17 .v-att { margin-top:1.4rem; display:flex; gap:2.2rem; flex-wrap:wrap; justify-content:center; }
.r17 .v-att div { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; }
.r17 .v-att b { display:block; color:var(--paper); font-weight:700; }
.r17 .v-att span { color:var(--dim); }
.r17 .v-att .on b { color:var(--gold); }
@media(max-width:640px){ .r17 .v-att { gap:1.1rem; } }

/* contact fine print */
.r17 .fine { margin-top:1.6rem; display:flex; gap:1.6rem; flex-wrap:wrap; justify-content:center; font-size:.78rem; color:var(--mut); }
.r17 .fine a:hover { color:var(--gold); }
.r17 .copyright { position:absolute; bottom:calc(3.4rem + env(safe-area-inset-bottom)); left:0; right:0; text-align:center; font-size:.64rem; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); z-index:3; }

/* video modal */
.r17 .modal { position:fixed; inset:0; z-index:400; background:rgba(0,0,0,.92); display:flex; align-items:center; justify-content:center; padding:clamp(.75rem,3vw,3rem); }
.r17 .modal-frame { position:relative; width:min(1100px,100%); aspect-ratio:16/9; background:#000; }
.r17 .modal-frame iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
.r17 .modal-x { position:absolute; top:-2.6rem; right:0; font-size:.78rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:var(--paper); }
.r17 .modal-x:hover { color:var(--gold); }

@media (prefers-reduced-motion: reduce) {
  .r17 { scroll-behavior:auto; }
  .r17 .rv, .r17 .strike i, .r17 .tile img { transition:none !important; transform:none !important; opacity:1 !important; }
}
`;

// ─── helpers ──────────────────────────────────────────────────────────────────

function GhostPanel({ text, rows = 6, solidRow = 3 }) {
  return (
    <div className="ghostpanel" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className={i === solidRow ? 'solid' : ''}>{text}</span>
      ))}
    </div>
  );
}

function Slide({ id, className = '', first = false, children }) {
  const ref = useRef(null);
  // The first slide reveals on mount: IntersectionObserver is throttled in
  // background tabs (the R15 lesson), and the first paint must never be blank.
  const [inView, setInView] = useState(first);
  useEffect(() => {
    if (first) return;
    if (!ref.current || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const obs = new IntersectionObserver(
      es => { if (es[0]?.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.35 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [first]);
  return (
    <section id={id} ref={ref} className={`slide ${inView ? 'in' : ''} ${className}`}>
      {children}
    </section>
  );
}

// One media panel per slide per side; null = black (the side sweeps to dark).
const LEFT_PANELS = [
  <>
    <div className="vid"><LazyGumlet id={HERO_REEL} eager filter="none" bleed={1.14} offsetY={-28} poster="transparent" /></div>
    <img className="pstr" src={poster(HERO_REEL)} alt="" />
  </>,
  <img src={poster(PALA_REEL)} alt="" loading="lazy" />,
  <img src="/hero-sites/ambition.jpg" alt="" loading="lazy" />,
  null,
  null,
  <GhostPanel text="Three films" />,
  <img src="/hero-sites/space-rising.jpg" alt="" loading="lazy" />,
  <GhostPanel text="Top-5 insurer" />,
  <img src="/hero-sites/ambition.jpg" alt="" loading="lazy" />,
  null,
  <img src={poster(BILL_REEL)} alt="" loading="lazy" />,
  null,
  null,
  null,
];

const RIGHT_PANELS = [
  <>
    <div className="vid"><LazyGumlet id={FILM_REEL} eager filter="none" bleed={1.14} offsetY={-28} poster="transparent" /></div>
 {/* Virtu's first frame is its title card, use the Nook frame as the small-screen poster */}
    <img className="pstr" src={poster(NOOK_REEL)} alt="" />
  </>,
  <img src={poster(BILL_REEL)} alt="" loading="lazy" />,
  <img src="/hero-sites/space-rising.jpg" alt="" loading="lazy" />,
  null,
  null,
  <GhostPanel text="Investor ready" solidRow={2} />,
  <GhostPanel text="1,000 in a room" />,
  <GhostPanel text="Inspire Summit" solidRow={2} />,
  <GhostPanel text="4 leads / mo" />,
  null,
  <img src={poster(HERO_REEL)} alt="" loading="lazy" />,
  null,
  null,
  null,
];

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HomeR5Preview() {
  const [video, setVideo] = useState(null);
  const close = useCallback(() => setVideo(null), []);
  const boxRef = useRef(null);
  const colL = useRef(null);
  const colR = useRef(null);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // The counter-scroll: direct transform writes on scroll (no React state).
  // Panel height equals the clip window height (100svh desktop, 50svh mobile),
  // while the snap step is always the container height.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !colL.current || !colR.current) return;
    const apply = () => {
      const H = box.clientHeight;
      const ph = colL.current.parentElement.clientHeight;
      const p = H ? box.scrollTop / H : 0;
      colL.current.style.transform = `translate3d(0, ${-p * ph}px, 0)`;
      colR.current.style.transform = `translate3d(0, ${(p - (N_SLIDES - 1)) * ph}px, 0)`;
    };
    apply();
    box.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', apply);
    return () => { box.removeEventListener('scroll', apply); window.removeEventListener('resize', apply); };
  }, []);

  // Deep links (#story/#work/#contact): the reel mounts after the browser's
  // native anchor pass, so jump to the hash target ourselves. Instant, not
  // smooth — the container's scroll-behavior:smooth rides rAF, which is frozen
  // in background tabs (and an 11-slide sweep is wrong for a deep link anyway).
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (!h) return;
    const t = setTimeout(() => {
      const el = document.getElementById(h);
      const box = boxRef.current;
      if (el && box) box.scrollTo({ top: el.offsetTop, behavior: 'instant' });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="r17" ref={boxRef}>
      <style>{CSS}</style>

      {/* counter-scroll backdrop: right column stacked in reverse, rides down */}
      <div className="bk" aria-hidden="true">
        <div className="bk-win l">
          <div className="bk-col l" ref={colL}>
            {LEFT_PANELS.map((p, i) => <div key={i} className="bk-panel">{p}</div>)}
          </div>
        </div>
        <div className="bk-win r">
          <div className="bk-col r" ref={colR}>
            {[...RIGHT_PANELS].reverse().map((p, i) => <div key={i} className="bk-panel">{p}</div>)}
          </div>
        </div>
      </div>

      {/* fixed corner chrome */}
      <div className="chrome top">
        <a href="#work">Work</a>
        <a className="mid" href="#story">Story</a>
        <a href="#contact">Contact us</a>
      </div>
      <div className="chrome bot" aria-hidden="true">
        <span className="brand">Ahead</span>
        <span className="mid brand">of</span>
        <span className="brand">Market<i className="sq" /></span>
      </div>

      {/* 00 — HERO: two live reels, the claim */}
      <Slide first>
        <div className="stack">
          <div className="tags rv">
            <span>Story &amp; Film</span>
            <span>Web &amp; Digital</span>
            <span>Brand &amp; Ads</span>
          </div>
          <h1 className="title">
            <span className="row rv d1">We make</span>
            <span className="row rv d2">companies</span>
            <span className="row rv d3">impossible</span>
            <span className="row rv d4">to ignore<i className="sq" /></span>
          </h1>
 <p className="sub rv d4">Hi. We're Ahead of Market, a storytelling company from <span style={{ whiteSpace: 'nowrap' }}>Phoenix, AZ.</span></p>
 <span className="stat rv d4">Phoenix, AZ, Since 2020 · Scroll ↓</span>
        </div>
      </Slide>

      {/* 01 — STORY BEAT: the video company */}
      <Slide id="story">
        <div className="stack">
 <div className="tags rv"><span>So, who are we, exactly?</span><span>Many companies around Phoenix know us as</span></div>
          <h2 className="title">
            <span className="row rv d1">A video</span>
            <span className="row rv d2">company<i className="sq" /></span>
          </h2>
 <p className="sub rv d3">Frames from our films, playing behind this.</p>
        </div>
      </Slide>

      {/* 02 — STORY BEAT: the web company */}
      <Slide>
        <div className="stack">
          <div className="tags rv"><span>Others know us as</span></div>
          <h2 className="title">
            <span className="row rv d1">A web dev</span>
            <span className="row rv d2">company<i className="sq" /></span>
          </h2>
 <p className="sub rv d3">Sites we've built, standing behind this.</p>
        </div>
      </Slide>

      {/* 03 — STORY BEAT: neither */}
      <Slide>
        <span className="ghost-word" aria-hidden="true">Neither</span>
        <div className="stack">
          <div className="tags rv"><span>We're actually</span></div>
          <h2 className="title">
            <span className="row rv d1"><span className="strike">Neither<i /></span></span>
            <span className="row rv d2">of those things<i className="sq" /></span>
          </h2>
        </div>
      </Slide>

      {/* 04 — STORY BEAT: the payoff */}
      <Slide>
        <BrandMark kind="mono" className="ghost-mark" />
        <div className="stack">
          <div className="tags rv"><span>What we actually are</span></div>
          <h2 className="title">
            <span className="row rv d1 gold">A storytelling</span>
            <span className="row rv d2 gold">company<i className="sq" /></span>
          </h2>
 <p className="sub rv d3">, we just happen to make videos and web apps often.</p>
        </div>
      </Slide>

      {/* 05 — CASE: ISA Energy */}
      <Slide>
        <div className="stack">
          <div className="tags rv"><span>Energy · Film</span><span>A demo, a validation study, a brand film</span></div>
          <h2 className="title">
            <span className="row rv d1">ISA</span>
            <span className="row rv d2">Energy<i className="sq" /></span>
          </h2>
          <p className="sub rv d3">A three-video series, now in every investor meeting.</p>
          <span className="stat rv d4">Helped raise a substantial round</span>
        </div>
      </Slide>

      {/* 06 — CASE: Space Rising */}
      <Slide>
        <div className="stack">
 <div className="tags rv"><span>Tech · Platform</span><span>SpaceOS, built and launched</span></div>
          <h2 className="title">
            <span className="row rv d1">Space</span>
            <span className="row rv d2">Rising<i className="sq" /></span>
          </h2>
 <p className="sub rv d3">SpaceOS, and 1,000 people in one room at Space Congress.</p>
          <span className="stat rv d4">Drove a wave of traffic to the new platform</span>
        </div>
      </Slide>

      {/* 07 — CASE: Included Health */}
      <Slide>
        <div className="stack">
          <div className="tags rv"><span>Healthcare · Film</span><span>A film series, screened nationwide</span></div>
          <h2 className="title">
            <span className="row rv d1">Included</span>
            <span className="row rv d2">Health<i className="sq" /></span>
          </h2>
          <p className="sub rv d3">Films for one of the largest insurers in the US.</p>
          <span className="stat rv d4">Produced for the Inspire Summit</span>
        </div>
      </Slide>

      {/* 08 — CASE: Ambition Mechanical */}
      <Slide>
        <div className="stack">
          <div className="tags rv"><span>Trades · Web + Ads</span><span>The new site pulls its own weight</span></div>
          <h2 className="title">
            <span className="row rv d1">Ambition</span>
            <span className="row rv d2">Mechanical<i className="sq" /></span>
          </h2>
          <p className="sub rv d3">Four solid leads a month, organically.</p>
          <span className="stat rv d4">Before paid spend even counts</span>
        </div>
      </Slide>

      {/* 09 — TWO PARTS */}
      <Slide className="slide-parts">
        <div className="parts-col l rv">
 <div className="parts-head">Marketing, the materials your message stands on</div>
          <ul className="parts-list">
            <li>Websites &amp; web applications</li>
            <li>Brand films &amp; video series</li>
            <li>Quizzes &amp; interactive tools for prospects</li>
            <li>Photography &amp; creative assets</li>
          </ul>
        </div>
        <div className="parts-col r rv">
 <div className="parts-head">Promotion, how it gets out into the world</div>
          <ul className="parts-list">
            <li>Google &amp; Meta ad campaigns</li>
            <li>Influencer posts &amp; partnerships</li>
            <li>Email &amp; text-message campaigns</li>
            <li>SEO &amp; content distribution</li>
          </ul>
        </div>
        <div className="stack">
          <div className="tags rv"><span>What we actually do</span><span>Everything we make falls into</span></div>
          <h2 className="title">
            <span className="row rv d1">Two</span>
            <span className="row rv d2">parts<i className="sq" /></span>
          </h2>
        </div>
      </Slide>

      {/* 10 — THE BILLBOARD TEST */}
      <Slide>
        <div className="stack">
          <div className="tags rv"><span>The billboard test</span></div>
          <h2 className="title">
            <span className="row rv d1">A billboard</span>
            <span className="row rv d2">does no good</span>
            <span className="row rv d3">in your <span className="gold">basement</span><i className="sq" /></span>
          </h2>
          <p className="sub rv d4">Great work needs promotion. We do both.</p>
        </div>
      </Slide>

      {/* 11 — THE WORK: mosaic */}
      <Slide id="work">
        <div className="mosaic">
          {PORTFOLIO.map(v => (
            <button key={v.id} className="tile" onClick={() => setVideo(v)} aria-label={`Play ${v.t}`}>
              <img src={poster(v.id, 800)} alt="" loading="lazy" />
              <span className="tl">{v.t}</span>
            </button>
          ))}
        </div>
        <div className="stack mosaic-stack">
          <div className="tags rv"><span>100+ projects shipped since 2020</span><span>Tap any film to play</span></div>
          <h2 className="title">
            <span className="row rv d1">The</span>
            <span className="row rv d2">work<i className="sq" /></span>
          </h2>
        </div>
      </Slide>

      {/* 12 — VOICES */}
      <Slide>
        <span className="ghost-word" aria-hidden="true">Voices</span>
        <div className="stack">
          <div className="tags rv"><span>Voices</span><span>Startup AZ Foundation, on our film</span></div>
          <h2 className="title">
            <span className="row rv d1">"It did the</span>
            <span className="row rv d2">selling</span>
            <span className="row rv d3">for us"<i className="sq" /></span>
          </h2>
          <div className="v-att rv d4">
            <div className="on"><b>Brandon Clarke</b><span>Startup AZ Foundation</span></div>
            <div><b>Sumit Seth</b><span>Naamly SaaS</span></div>
            <div><b>Gio Osso</b><span>Virtu Hospitality Group</span></div>
          </div>
        </div>
      </Slide>

      {/* 13 — CONTACT */}
      <Slide id="contact">
        <BrandMark kind="mono" className="ghost-mark" />
        <div className="stack">
          <div className="tags rv"><span>Start a conversation</span></div>
          <h2 className="title">
            <span className="row rv d1">Ready</span>
            <span className="row rv d2">when</span>
            <span className="row rv d3">you are<i className="sq" /></span>
          </h2>
          <a className="btn-gold rv d4" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
          <div className="fine rv d4">
            <a href="mailto:hello@aheadofmarket.com">hello@aheadofmarket.com</a>
            <a href="tel:+16023732164">602 373 2164</a>
            <span>We reply within 24 hours</span>
          </div>
        </div>
        <div className="copyright">© 2026 Ahead of Market. All rights reserved.</div>
      </Slide>

      {/* video modal */}
      {video && (
        <div className="modal" onClick={close} role="dialog" aria-label={video.t}>
          <div className="modal-frame" onClick={e => e.stopPropagation()}>
            <button className="modal-x" onClick={close}>Close ✕</button>
            <iframe src={embed(video.id)} title={video.t} allow="autoplay; fullscreen; encrypted-media" allowFullScreen />
          </div>
        </div>
      )}
    </div>
  );
}