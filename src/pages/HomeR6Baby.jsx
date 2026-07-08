import React, { useState, useEffect, useRef, useCallback } from 'react';
import LazyGumlet from '../components/home/LazyGumlet';
import BrandMark from '../components/home/BrandMark';

// Mounted at /r6 for review. Mission: aheadofmarket.com:home (R19).
// "The clean baby" — Patrik: "I want this design to have a clean baby with the hear design."
// The child of /r5 (the Glitch&Grit-structure counter-scroll reel) and /hear (the hear.agency
// translation). Inherited from /hear: the obsidian void opening — the official AOM monogram +
// square period as the only window into live client footage (a #000 multiply sheet), scroll
// zooming through the mark until the footage goes full-bleed; case index counters on the client
// slides. Inherited from /r5: everything after the opening — the counter-scrolling split-screen
// backdrop, the verbatim story copy, Inter Tight 800 uppercase + gold square period, the
// AHEAD / OF / MARKET corner chrome, snap rhythm, work mosaic, contact slide. /r5 and /hear
// stay untouched so all three stand side by side for judgment.

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

const HERO_REEL = '698a6296fc23d3d76fa8d992'; // Journey to Gary Vee — strongest doc footage
const FILM_REEL = '698a5ef5fc23d3d76fa87ef4'; // Virtu Hospitality
const BILL_REEL = '698a5fcdfc23d3d76fa893b8'; // United Food Bank — under the billboard line
const PALA_REEL = '698a5391fc23d3d76fa7306c'; // PA'LA x HARUMI
const NOOK_REEL = '698a5a8b873071aec5c99c6f'; // Nook 10 Year — clean frame for small screens

const N_SLIDES = 14;

// hear-hero scroll program, in viewport-heights: hold, zoom through the mark,
// then one viewport where the full-bleed stage scrolls away into the reel.
const HOLD = 0.2;
const ZOOM = 1.4;
const RUNWAY_VH = HOLD + ZOOM + 1; // 2.6

const embed = id => `https://play.gumlet.io/embed/${id}?autoplay=true&preload=false&loop=false&background=false&disable_player_controls=false`;
const poster = (id, w = 1200) => `https://video.gumlet.io/697678222b8b17fbb707acef/${id}/thumbnail-1-0.png?format=auto&w=${w}`;

// Case video wrapper — cover-fills like img, respects prefers-reduced-motion
function CaseVideo({ src, posterSrc, caseIndex }) {
  const vidRef = useRef(null);
  const fallback = typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!fallback) return; // respects prefers-reduced-motion
    const caseSlide = document.querySelector(`[data-case="${caseIndex}"]`);
    if (!caseSlide) return;

    const obs = new IntersectionObserver(
      es => {
        if (es[0]?.isIntersecting) {
          if (vidRef.current) vidRef.current.play().catch(() => {});
        } else {
          if (vidRef.current) vidRef.current.pause();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(caseSlide);
    return () => obs.disconnect();
  }, [fallback, caseIndex]);

  return (
    <video
      ref={vidRef}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      poster={posterSrc}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      aria-hidden="true"
    />
  );
}

// ─── BRIEF MODAL STATE & LOGIC ────────────────────────────────────────────

function BriefModal({ open, onClose }) {
  const [step, setStep] = useState(0); // 0=name+email, 1=making, 2=goal
  const [formData, setFormData] = useState({ name: '', email: '', making: '', goal: '', budget: '' });
  const makingOptions = ['Brand film', 'Website', 'Strategy', 'Documentary', 'Not sure'];
  const totalSteps = 3;
  const progressWidth = ((step + 1) / totalSteps) * 100;

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const submit = () => {
    const body = `Name: ${formData.name}\nEmail: ${formData.email}\nWhat are you making: ${formData.making}\nGoal: ${formData.goal}\nBudget/Timeline: ${formData.budget || '(not specified)'}`;
    window.location.href = `mailto:hello@aheadofmarket.com?subject=Brief from ${encodeURIComponent(formData.name)}&body=${encodeURIComponent(body)}`;
    onClose();
  };

  if (!open) return null;

  return (
    <div className="brief-modal" onClick={onClose} role="dialog" aria-label="Creative brief">
      <div className="brief-modal-inner" onClick={e => e.stopPropagation()} style={{ '--progress-width': `${progressWidth}%` }}>
        <button className="brief-modal-x" onClick={onClose} aria-label="Close">✕</button>

        {step === 0 && (
          <div className="brief-step">
            <h3>Let's start with the basics</h3>
            <input
              type="text"
              placeholder="Your name"
              value={formData.name}
              onChange={e => updateForm('name', e.target.value)}
              autoFocus
            />
            <input
              type="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={e => updateForm('email', e.target.value)}
            />
            <button onClick={next} className="brief-next" disabled={!formData.name.trim() || !formData.email.trim()}>Next</button>
          </div>
        )}

        {step === 1 && (
          <div className="brief-step">
            <h3>What are you making?</h3>
            <div className="brief-chips">
              {makingOptions.map(opt => (
                <button
                  key={opt}
                  className={`brief-chip ${formData.making === opt ? 'active' : ''}`}
                  onClick={() => {
                    updateForm('making', opt);
                    setTimeout(next, 100);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="brief-step">
            <h3>What's the goal?</h3>
            <textarea
              placeholder="One line about what success looks like for you"
              value={formData.goal}
              onChange={e => updateForm('goal', e.target.value)}
              autoFocus
              rows="2"
            />
            <div className="brief-optional">
              <input
                type="text"
                placeholder="Budget / timeline (optional)"
                value={formData.budget}
                onChange={e => updateForm('budget', e.target.value)}
              />
            </div>
            <button onClick={submit} className="brief-next brief-submit" disabled={!formData.goal.trim()}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
.r17 {
  --ink:#060606; --ink-2:#0B0B0A; --paper:#F6F6F4;
  --mut:rgba(246,246,244,.8); --dim:rgba(246,246,244,.55);
  --line:rgba(255,255,255,.14); --gold:#C4A46A; --gold-deep:#A8884C;
  --fx:'Inter',system-ui,Helvetica,Arial,sans-serif;
  --fd:'Inter Tight','Inter',system-ui,Helvetica,Arial,sans-serif;
  --fbrut:'Space Grotesk',system-ui,Helvetica,Arial,sans-serif;
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

/* scroll progress hairline (the R15 rail, carried forward) */
.r17 .rail { position:fixed; top:0; left:0; height:2px; background:var(--gold); z-index:230; width:0; }

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
.r17 .chrome-link { pointer-events:auto; font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; text-shadow:0 1px 14px rgba(0,0,0,.75); color:var(--paper); transition:color .15s; padding:0; display:inline-flex; align-items:center; gap:.55rem; }
.r17 .chrome-link:hover { color:var(--gold); }
.r17 .mburg { display:inline-flex; flex-direction:column; justify-content:center; gap:4px; width:18px; }
.r17 .mburg i { display:block; height:1.5px; width:100%; background:currentColor; transition:transform .2s, background .15s; }
.r17 .chrome-link:hover .mburg i:first-child { transform:translateX(2px); }

/* ─── WORK overlay: the full site map ─── */
.r17 .hz-menu { position:fixed; inset:0; z-index:400; background:rgba(6,6,6,.985); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); opacity:0; visibility:hidden; transition:opacity .3s ease, visibility .3s ease; display:flex; align-items:center; justify-content:center; padding:clamp(1.5rem,6vh,5rem) var(--pad); }
.r17 .hz-menu.open { opacity:1; visibility:visible; }
.r17 .hz-menu-inner { width:min(720px,100%); max-height:100%; overflow-y:auto; }
.r17 .hz-menu-x { position:absolute; top:1.25rem; right:var(--pad); font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:var(--paper); transition:color .15s; }
.r17 .hz-menu-x:hover { color:var(--gold); }
.r17 .hz-menu-kick { font-size:.66rem; font-weight:600; letter-spacing:.24em; text-transform:uppercase; color:var(--gold); margin:1.6rem 0 .5rem; }
.r17 .hz-menu-kick:first-child { margin-top:0; }
.r17 .hz-menu-row { display:flex; flex-direction:column; align-items:flex-start; text-align:left; width:100%; padding:.7rem 0; border-top:1px solid rgba(255,255,255,.1); transition:padding-left .25s cubic-bezier(.16,1,.3,1); }
.r17 .hz-menu-row:hover { padding-left:.6rem; }
.r17 .hz-menu-t { font-family:var(--fd); font-weight:800; text-transform:uppercase; font-size:clamp(1.5rem,3.4vw,2.4rem); line-height:1.05; letter-spacing:-.01em; color:var(--paper); transition:color .15s; }
.r17 .hz-menu-row:hover .hz-menu-t { color:var(--gold); }
.r17 .hz-menu-row.big .hz-menu-t { font-size:clamp(1.9rem,4.4vw,3rem); }
.r17 .hz-menu-sub { font-size:.82rem; color:var(--mut); margin-top:.2rem; font-family:var(--fbrut); font-weight:700; }

/* two-parts service links */
.r17 .parts-link { color:inherit; transition:color .15s; }
.r17 .parts-link:hover { color:var(--gold); }
.r17 .parts-link .arw { font-size:.8em; opacity:.7; }

/* ─── counter-scroll backdrop: two clipped windows, each holding a column of
   viewport-height panels. Left column rides up with scroll; right column is
   stacked in REVERSE and rides down, so pairs still meet at every snap. ─── */
.r17 .bk { position:fixed; inset:0; z-index:0; pointer-events:none; }
.r17 .bk-win { position:absolute; overflow:hidden; }
.r17 .bk-win.l { left:0; top:0; width:50%; height:100%; border-right:1px solid var(--line); }
.r17 .bk-win.r { right:0; top:0; width:50%; height:100%; }
.r17 .bk-col { position:absolute; left:0; top:0; width:100%; will-change:transform; }
.r17 .bk-col.r { transform:translateY(calc(-13 * 100svh)); }
.r17 .bk-panel { position:relative; width:100%; height:100svh; overflow:hidden; background:var(--ink); }
.r17 .bk-panel::after { content:''; position:absolute; inset:0; background:rgba(4,4,4,.44); z-index:2; }
.r17 .bk-panel > img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
@media(max-width:860px){
  .r17 .bk-win.l { width:100%; height:50%; border-right:none; border-bottom:1px solid var(--line); }
  .r17 .bk-win.r { left:0; right:auto; top:50%; width:100%; height:50%; }
  .r17 .bk-col.r { transform:translateY(calc(-13 * 50svh)); }
  .r17 .bk-panel { height:50svh; }
  .r17 .bk-panel::after { background:rgba(4,4,4,.55); }
  .r17 .tags { gap:.4rem; }
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

/* ─── hear hero: runway + sticky stage, monogram as the window into footage ─── */
.r17 .hz { position:relative; height:${RUNWAY_VH * 100}svh; scroll-snap-align:start; z-index:2; }
/* isolation + own compositor layer: multiply must blend against THIS stage only —
   without it Chrome can drop the blend mid-scroll in a sticky ancestor and the
   mark flashes solid (Patrik's scroll-back-to-top bug) */
.r17 .hz-stage { position:sticky; top:0; height:100svh; overflow:hidden; background:var(--ink); isolation:isolate; transform:translateZ(0); }
.r17 .hz-video { position:absolute; inset:0; }
.r17 .hz-video .pstr { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; }
.r17 .hz-video .vid { position:absolute; inset:0; z-index:1; }
@media(max-width:860px){ .r17 .hz-video .vid { display:none; } }
.r17 .hz-mask {
  position:absolute; inset:0; z-index:3; background:#000; mix-blend-mode:multiply;
  display:flex; align-items:center; justify-content:center;
  will-change:opacity;
}
.r17 .hz-gold { position:absolute; inset:0; z-index:4; pointer-events:none; display:flex; align-items:center; justify-content:center; }
.r17 .hz .wm { display:flex; align-items:flex-end; white-space:nowrap; transform-origin:55% 30%; color:#fff; }
.r17 .hz .wm svg { display:block; height:min(68vh,72vw); width:auto; }
@media(max-width:860px){ .r17 .hz .wm svg { height:min(40vh,74vw); } }
.r17 .hz-gold .wm { color:#F6F6F4; }
.r17 .hz-gold .wm svg { opacity:.09; }
.r17 .hz .wm .dot { display:inline-block; width:clamp(1.4rem,4vw,3.4rem); height:clamp(1.4rem,4vw,3.4rem); margin-left:clamp(.8rem,2vw,1.8rem); background:#fff; }
.r17 .hz-gold .wm .dot { background:var(--gold); opacity:1; }
.r17 .hz-chrome { position:absolute; inset:0; z-index:5; pointer-events:none; }
.r17 .hz-intro {
  position:absolute; left:50%; transform:translateX(-50%);
  bottom:calc(clamp(4.5rem,10vh,7rem) + env(safe-area-inset-bottom));
  width:min(34rem,84vw); text-align:center;
  font-size:clamp(.85rem,1.15vw,1rem); color:var(--mut); line-height:1.65;
  font-family:var(--fbrut); font-weight:700; letter-spacing:-.01em;
}
.r17 .hz-cue {
  position:absolute; left:50%; bottom:calc(clamp(2rem,5vh,3.4rem) + env(safe-area-inset-bottom));
  width:1px; height:30px; background:var(--gold); transform-origin:top;
  animation:r17cue 2.2s cubic-bezier(.6,0,.3,1) infinite;
}
@keyframes r17cue {
  0%{transform:translateX(-50%) scaleY(0);opacity:0}
  35%{transform:translateX(-50%) scaleY(1);opacity:1}
  70%,100%{transform:translateX(-50%) scaleY(1) translateY(14px);opacity:0}
}
@media (prefers-reduced-motion:reduce){ .r17 .hz-cue { animation:none; opacity:.6; transform:translateX(-50%); } }

/* branded sparkle star reveals on mouse move (hero side areas only) */
.r17 .sparkle { position:absolute; z-index:2; width:clamp(2rem,3vw,3.5rem); height:clamp(2rem,3vw,3.5rem); color:var(--gold); opacity:0; transition:opacity .4s ease; pointer-events:none; display:flex; align-items:center; justify-content:center; }
.r17 .sparkle svg { width:100%; height:100%; display:block; }
@media (prefers-reduced-motion:reduce){ .r17 .sparkle { display:none; } }

/* ─── slides: type only, transparent over the backdrop ─── */
.r17 .slide {
  position:relative; height:100svh; scroll-snap-align:start; scroll-snap-stop:always;
  overflow:hidden; background:transparent; z-index:1;
  display:flex; align-items:center; justify-content:center;
}

/* center stack */
.r17 .stack { position:relative; z-index:3; display:flex; flex-direction:column; align-items:center; text-align:center; padding:0 var(--pad); max-width:100%; }
.r17 .stack::before { content:''; position:absolute; inset:0; z-index:-1; background:radial-gradient(ellipse at center, rgba(4,4,4,.55), transparent 70%); pointer-events:none; }
.r17 .tags { display:flex; flex-direction:column; gap:.28rem; margin-bottom:1.1rem; }
.r17 .tags span { font-size:.68rem; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); text-shadow:0 1px 14px rgba(0,0,0,.9); font-family:var(--fbrut); }
.r17 .tags .idx { font-size:.95rem; font-weight:700; letter-spacing:.3em; margin-bottom:.3rem; font-family:var(--fd); }
.r17 #contact .tags > span:first-child { font-size:.95rem; font-weight:700; }
.r17 .title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(3.1rem,9.2vw,9.2rem); line-height:.9; letter-spacing:-.02em;
  text-shadow:0 3px 44px rgba(0,0,0,.55);
}
.r17 .title .row { display:block; }
.r17 .title .gold { color:var(--gold); }
.r17 .sub { margin-top:1.3rem; font-size:clamp(.95rem,1.5vw,1.12rem); color:var(--paper); opacity:.9; max-width:52ch; text-shadow:0 1px 16px rgba(0,0,0,.7); font-family:var(--fbrut); font-weight:700; letter-spacing:-.01em; }
.r17 .stat { margin-top:.55rem; font-size:.8rem; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); text-shadow:0 1px 12px rgba(0,0,0,.7); font-family:var(--fbrut); }
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
.r17 .strike i { position:absolute; left:-.05em; right:-.05em; top:52%; height:.09em; background:var(--gold); transform:scaleX(0); transform-origin:left center; transition:transform .6s cubic-bezier(.16,1,.3,1) .7s; }
.r17 .slide.in .strike i { transform:scaleX(1); }

/* ghost monogram / wordmark backdrops */
.r17 .ghost-mark { position:absolute; inset:0; display:flex !important; align-items:center; justify-content:center; z-index:1; color:rgba(196,164,106,.09); }
.r17 .ghost-mark svg { width:min(72vh,72vw); height:auto; display:block; margin:0 auto; }
.r17 .ghost-word {
  position:absolute; z-index:1; left:50%; top:50%; transform:translate(-50%,-50%);
  font-family:var(--fd); font-weight:800; text-transform:uppercase; white-space:nowrap;
  font-size:clamp(6rem,22vw,22rem); line-height:1; letter-spacing:-.02em;
  color:transparent; -webkit-text-stroke:1.5px rgba(246,246,244,.14); pointer-events:none;
}

/* two parts lists */
.r17 .parts-head { font-size:.72rem; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); margin-bottom:1rem; font-family:var(--fbrut); }
.r17 .parts-list { list-style:none; display:flex; flex-direction:column; gap:.85rem; }
.r17 .parts-list li { font-size:clamp(.85rem,1.3vw,1.02rem); color:var(--mut); line-height:1.65; border-top:1px solid rgba(255,255,255,.12); padding-top:.75rem; font-family:var(--fbrut); font-weight:700; }
.r17 .parts-list li:first-child { border-top:none; padding-top:0; }
.r17 .parts-col { position:absolute; z-index:3; top:0; height:100%; width:50%; display:flex; flex-direction:column; justify-content:flex-end; padding:0 var(--pad) 16svh; }
.r17 .parts-col.l { left:0; align-items:flex-start; text-align:left; }
.r17 .parts-col.r { right:0; align-items:flex-end; text-align:right; }
@media(max-width:860px){
  .r17 .parts-col { width:100%; }
  .r17 .parts-col.l { top:0; height:50%; justify-content:flex-start; padding:calc(3.4rem + 2svh) var(--pad) 0; }
  .r17 .parts-col.r { top:50%; height:50%; justify-content:flex-end; padding:0 var(--pad) calc(3.4rem + 2svh); }
  .r17 .slide-parts .title { font-size:clamp(2.2rem,8vw,4.5rem); }
  .r17 .ghost-mark { color:rgba(196,164,106,.16); }
  .r17 .parts-list li { color:rgba(246,246,244,.88); font-size:.95rem; }
}

/* work mosaic — endless dual-row scroll */
.r17 .mosaic { position:absolute; inset:0; display:flex; flex-direction:column; overflow:hidden; }
.r17 .mosaic-row { display:flex; gap:1rem; padding:1rem; height:50%; overflow:hidden; }
.r17 .mosaic-row.top { flex-direction:row; animation:mosaic-scroll-left 40s linear infinite; }
.r17 .mosaic-row.bottom { flex-direction:row; animation:mosaic-scroll-right 40s linear infinite; }
.r17 .mosaic-row:hover { animation-play-state:paused; }
@keyframes mosaic-scroll-left {
  0% { transform:translateX(0); }
  100% { transform:translateX(calc(-50% - 0.5rem)); }
}
@keyframes mosaic-scroll-right {
  0% { transform:translateX(calc(-50% - 0.5rem)); }
  100% { transform:translateX(0); }
}
.r17 .tile { position:relative; overflow:hidden; background:var(--ink-2); border:none; padding:0; flex-shrink:0; width:clamp(200px,25vw,400px); aspect-ratio:16/9; cursor:pointer; }
.r17 .tile img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:.55; transform:scale(1.04); transition:opacity .4s, transform .6s cubic-bezier(.16,1,.3,1); }
.r17 .tile:hover img { opacity:.95; transform:scale(1.01); }
.r17 .tile .tl { position:absolute; left:.9rem; bottom:.8rem; z-index:2; font-size:.62rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--paper); text-shadow:0 1px 10px rgba(0,0,0,.8); opacity:0; transition:opacity .3s; }
.r17 .tile:hover .tl { opacity:1; }
.r17 .tile .play { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:3; font-size:2.4rem; color:var(--paper); text-shadow:0 2px 12px rgba(0,0,0,.8); opacity:0; transition:opacity .3s; }
.r17 .tile:hover .play { opacity:1; }
@media(max-width:860px){
  .r17 .mosaic-row { gap:0.75rem; padding:0.75rem; height:50%; }
  .r17 .tile { width:clamp(140px,40vw,280px); }
}
.r17 .mosaic-stack { pointer-events:none; }
.r17 .mosaic-stack .view { pointer-events:auto; }

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

/* brief modal — premium guided contact form */
.r17 .brief-modal { position:fixed; inset:0; z-index:410; background:rgba(0,0,0,.85); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); display:flex; align-items:center; justify-content:center; padding:clamp(1rem,3vw,2rem); animation:fadeIn .3s ease; }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
.r17 .brief-modal-inner { position:relative; width:min(420px,100%); background:var(--ink); border:1px solid rgba(196,164,106,.14); border-radius:12px; padding:clamp(2rem,4vw,3rem); padding-top:clamp(3rem,4vw,4rem); max-height:90vh; overflow-y:auto; box-shadow:0 20px 80px rgba(0,0,0,.6); }
.r17 .brief-modal-inner::before { content:''; position:absolute; top:0; left:0; height:3px; background:var(--gold); border-radius:12px 12px 0 0; width:var(--progress-width, 33%); transition:width .4s ease; }
.r17 .brief-modal-x { position:absolute; top:1.2rem; right:1.2rem; font-size:.8rem; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--paper); background:none; border:none; cursor:pointer; transition:color .15s; padding:0; }
.r17 .brief-modal-x:hover { color:var(--gold); }
.r17 .brief-step h3 { font-family:var(--fd); font-size:1.8rem; font-weight:800; text-transform:uppercase; color:var(--paper); margin-bottom:1.6rem; line-height:1.1; letter-spacing:-.01em; }
.r17 .brief-step { animation:brief-fade-in .2s ease; }
@keyframes brief-fade-in { from { opacity:0; } to { opacity:1; } }
.r17 .brief-step input, .r17 .brief-step textarea { width:100%; padding:.65rem 1rem; background:var(--ink-2); border:1px solid rgba(196,164,106,.24); border-radius:8px; font-family:var(--fbrut); font-size:.95rem; color:var(--paper); transition:border-color .2s; margin-bottom:.8rem; }
.r17 .brief-step textarea { margin-bottom:.8rem; }
.r17 .brief-optional input { margin-bottom:0; }
.r17 .brief-step input::placeholder, .r17 .brief-step textarea::placeholder { color:rgba(246,246,244,.5); }
.r17 .brief-step input:focus, .r17 .brief-step textarea:focus { outline:none; border-color:var(--gold); background:var(--ink); }
.r17 .brief-optional { margin-top:1rem; }
.r17 .brief-chips { display:grid; grid-template-columns:1fr 1fr; gap:.8rem; margin-bottom:0; }
.r17 .brief-chip { padding:.7rem 1rem; background:var(--ink-2); border:1px solid rgba(196,164,106,.24); border-radius:8px; color:var(--paper); font-family:var(--fbrut); font-size:.9rem; font-weight:500; cursor:pointer; transition:all .2s; text-align:center; }
.r17 .brief-chip:hover { border-color:var(--gold); color:var(--gold); }
.r17 .brief-chip.active { background:var(--gold); color:var(--ink); border-color:var(--gold); }
.r17 .brief-next { margin-top:1.8rem; width:100%; padding:.75rem 1.2rem; background:var(--gold); color:var(--ink); border:none; border-radius:8px; font-family:var(--fbrut); font-size:.95rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; transition:all .2s; }
.r17 .brief-next:hover:not(:disabled) { background:var(--gold-deep); }
.r17 .brief-next:disabled { opacity:.5; cursor:not-allowed; }
.r17 .brief-submit { background:var(--gold); }
@media(max-width:640px){
  .r17 .brief-modal-inner { width:100%; padding:1.6rem 1.2rem; }
  .r17 .brief-step h3 { font-size:1.4rem; margin-bottom:1.2rem; }
  .r17 .brief-chips { grid-template-columns:1fr; }
}

/* section rhythm hairlines */
.r17 .slide-parts { border-top:1px solid rgba(196,164,106,.12); }
.r17 #work { border-top:1px solid rgba(196,164,106,.12); }
.r17 .slide:nth-of-type(13) { border-top:1px solid rgba(196,164,106,.12); }
.r17 #contact { border-top:1px solid rgba(196,164,106,.12); }

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

function Slide({ id, className = '', first = false, children, ...attrs }) {
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
    <section id={id} ref={ref} className={`slide ${inView ? 'in' : ''} ${className}`} {...attrs}>
      {children}
    </section>
  );
}

// Helper to build panels with CaseVideo components (must be inside component to get refs/effects right)
const makePanels = () => {
  const LEFT_PANELS = [
    <>
      <div className="vid"><LazyGumlet id={HERO_REEL} eager filter="none" bleed={1.14} offsetY={-28} poster="transparent" /></div>
      <img className="pstr" src={poster(HERO_REEL)} alt="" />
    </>,
    <img src={poster(PALA_REEL)} alt="" loading="lazy" />,
    <img src="/hero-sites/ambition.jpg" alt="" loading="lazy" />,
    null,
    null,
    <CaseVideo src="/videos/isa-brand.mp4" posterSrc="/videos/isa-brand.jpg" caseIndex={0} />,
    <CaseVideo src="/videos/spacerising-render.mp4" posterSrc="/videos/spacerising-render.jpg" caseIndex={1} />,
    <CaseVideo src="/videos/ih-culture.mp4" posterSrc="/videos/ih-culture.jpg" caseIndex={2} />,
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
      <img className="pstr" src={poster(NOOK_REEL)} alt="" />
    </>,
    <img src={poster(BILL_REEL)} alt="" loading="lazy" />,
    <img src="/hero-sites/space-rising.jpg" alt="" loading="lazy" />,
    null,
    null,
    <CaseVideo src="/videos/isa-demo.mp4" posterSrc="/videos/isa-demo.jpg" caseIndex={0} />,
    <CaseVideo src="/videos/spacerising-render.mp4" posterSrc="/videos/spacerising-render.jpg" caseIndex={1} />,
    <CaseVideo src="/videos/ih-life.mp4" posterSrc="/videos/ih-life.jpg" caseIndex={2} />,
    <CaseVideo src="/videos/ambition-vertical.mp4" posterSrc="/videos/ambition-vertical.jpg" caseIndex={3} />,
    null,
    <img src={poster(HERO_REEL)} alt="" loading="lazy" />,
    null,
    null,
    null,
  ];

  return { LEFT_PANELS, RIGHT_PANELS };
};

// ─── page ─────────────────────────────────────────────────────────────────────

// the site map surfaced through the WORK overlay — the R4 nav "brought to life"
const SERVICES = [
  { t: 'Brand film', href: '/services/brand-film', sub: 'Video series that make companies impossible to ignore' },
  { t: 'Website design & build', href: '/services/web-build', sub: 'Sites and platforms, built or rebuilt fast' },
  { t: 'Strategy & story', href: '/services/strategy', sub: 'One clear position, deployable everywhere' },
  { t: 'Documentary', href: '/services/documentary', sub: 'Long-form we commit months to' },
];

const WORK_FILTERS = [
  { t: 'Construction', href: '/work/construction' },
  { t: 'Tech & SaaS', href: '/work/tech-saas' },
  { t: 'Nonprofit', href: '/work/nonprofit' },
];

const ABOUT = [
  { t: 'Our story', href: '/about/our-story' },
  { t: 'How we work', href: '/about/how-we-work' },
  { t: 'Standards', href: '/about/standards' },
];

export default function HomeR6Baby() {
  const { LEFT_PANELS, RIGHT_PANELS } = makePanels();
  const [video, setVideo] = useState(null);
  const [menu, setMenu] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('menu') === '1'; }
    catch { return false; }
  });
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [filmCyclePosterIndex, setFilmCyclePosterIndex] = useState(0);

  const close = useCallback(() => setVideo(null), []);
  const jump = useCallback((id) => {
    setMenu(false);
    const el = document.getElementById(id);
    const box = boxRef.current;
    if (el && box) box.scrollTo({ top: el.offsetTop, behavior: 'instant' });
  }, []);
  const boxRef = useRef(null);
  const colL = useRef(null);
  const colR = useRef(null);
  const wmA = useRef(null);
  const wmB = useRef(null);
  const maskL = useRef(null);
  const goldL = useRef(null);
  const chromeL = useRef(null);
  const railRef = useRef(null);
  const sparkleRefs = useRef([]);
  const sparkleState = useRef({ activeSparkles: new Set() });
  // shared hero transform state: scroll owns scale + drift, pointer owns mouse drift;
  // all fold into one composed transform so neither clobbers the other
  const hero = useRef({ s: 1, x: 0, y: 0, tx: 0, ty: 0, drift: 0 });

  const writeWm = useCallback(() => {
    const h = hero.current;
    // Drift is scroll-driven (z) + pointer-driven (x). Both fold into one composed transform.
    const driftX = h.x + h.drift;
    const t = `translate3d(${driftX.toFixed(2)}px, ${h.y.toFixed(2)}px, 0) scale(${h.s})`;
    if (wmA.current && wmB.current) wmA.current.style.transform = wmB.current.style.transform = t;
  }, []);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { close(); setMenu(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // One scroll program, direct style writes (no React state).
  // Phase 1 (the hear inheritance): zoom the monogram window until the footage
  // is full-bleed, then the stage scrolls away. Phase 2 (the r5 inheritance):
  // the counter-scroll — slide progress starts after the runway.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !colL.current || !colR.current) return;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const ease = t => t * t * (3 - 2 * t);
    const apply = () => {
      const H = box.clientHeight;
      if (!H) return;
      const y = box.scrollTop / H;
      // hero zoom + sideways drift: as z progresses (0→1), logo drifts outward/off to the side
      const z = clamp01((y - HOLD) / ZOOM);
      hero.current.s = 1 + ease(z) * 34;
      // drift: 0 at z=0, ±80px at z=1. Alternates left/right by viewport width.
      hero.current.drift = (window.innerWidth / 2 > window.innerHeight ? -80 : 80) * ease(z);
      writeWm();
      if (maskL.current) {
        maskL.current.style.opacity = String(1 - clamp01((z - 0.78) / 0.22));
        maskL.current.style.visibility = z >= 1 ? 'hidden' : 'visible';
      }
      if (goldL.current) {
        goldL.current.style.opacity = String(1 - clamp01(z / 0.5));
        goldL.current.style.visibility = z >= 1 ? 'hidden' : 'visible';
      }
      if (chromeL.current) chromeL.current.style.opacity = String(1 - clamp01(z / 0.25));
      if (railRef.current) {
        const max = box.scrollHeight - H;
        railRef.current.style.width = `${max > 0 ? (box.scrollTop / max) * 100 : 0}%`;
      }
      // counter-scroll, offset by the runway
      const ph = colL.current.parentElement.clientHeight;
      const p = Math.max(0, y - RUNWAY_VH);
      colL.current.style.transform = `translate3d(0, ${-p * ph}px, 0)`;
      colR.current.style.transform = `translate3d(0, ${(p - (N_SLIDES - 1)) * ph}px, 0)`;
    };
    apply();
    box.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', apply);
    return () => { box.removeEventListener('scroll', apply); window.removeEventListener('resize', apply); };
  }, [writeWm]);

  // The monogram follows the mouse (Patrik: "this would bring it to life").
  // Fine pointers on large screens only; lerped drift, off under reduced motion.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const ok = window.matchMedia('(pointer:fine)').matches
      && window.matchMedia('(min-width:861px)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!ok) return;
    const h = hero.current;
    const onMove = e => {
      h.tx = (e.clientX / window.innerWidth - 0.5) * 44;
      h.ty = (e.clientY / window.innerHeight - 0.5) * 30;
    };
    let raf;
    const tick = () => {
      h.x += (h.tx - h.x) * 0.06;
      h.y += (h.ty - h.y) * 0.06;
      if (Math.abs(h.tx - h.x) > 0.01 || Math.abs(h.ty - h.y) > 0.01) writeWm();
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, [writeWm]);

  // Sparkle stars reveal on mouse move in hero side areas (fine pointers, large screens only)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const ok = window.matchMedia('(pointer:fine)').matches
      && window.matchMedia('(min-width:861px)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!ok) return;
    const stage = document.querySelector('.r17 .hz-stage');
    if (!stage) return;
    const onMouseMove = e => {
      const rect = stage.getBoundingClientRect();
      if (rect.top > window.innerHeight || rect.bottom < 0) return; // stage not visible
      const relX = e.clientX - rect.left;
      const isLeftSide = relX < rect.width * 0.25;
      const isRightSide = relX > rect.width * 0.75;
      const nextActive = new Set();
      sparkleRefs.current.forEach((ref, i) => {
        if (!ref) return;
        const shouldShow = (i % 2 === 0 && isLeftSide) || (i % 2 === 1 && isRightSide);
        if (shouldShow) nextActive.add(i);
        ref.style.opacity = shouldShow ? '1' : '0';
      });
      sparkleState.current.activeSparkles = nextActive;
    };
    stage.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => stage.removeEventListener('mousemove', onMouseMove);
  }, []);

  // Film cycle for the "a video company" section — cycle through portfolio posters when in view
  useEffect(() => {
    const storySlide = document.getElementById('story');
    if (!storySlide || typeof IntersectionObserver === 'undefined') return;
    let raf;
    const obs = new IntersectionObserver(
      es => {
        const isInView = es[0]?.isIntersecting;
        if (isInView) {
          // Start cycling
          let idx = 0;
          const cycle = () => {
            setFilmCyclePosterIndex(idx % PORTFOLIO.length);
            idx++;
            raf = setTimeout(() => cycle(), 700);
          };
          raf = setTimeout(() => cycle(), 700);
        } else {
          // Stop cycling
          if (typeof raf !== 'undefined') clearTimeout(raf);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(storySlide);
    return () => {
      obs.disconnect();
      if (typeof raf !== 'undefined') clearTimeout(raf);
    };
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

      {/* scroll progress rail */}
      <div className="rail" ref={railRef} aria-hidden="true" />

      {/* fixed corner chrome — WORK opens the full site map */}
      <div className="chrome top">
        <button className="chrome-link" onClick={() => setMenu(true)} aria-label="Open menu">
          <span className="mburg" aria-hidden="true"><i /><i /></span>
          Menu
        </button>
        <a className="mid" href="#story" onClick={e => { e.preventDefault(); jump('story'); }}>Story</a>
        <button className="chrome-link" onClick={() => setBriefModalOpen(true)} style={{ fontSize: 'inherit', fontWeight: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', textShadow: 'inherit' }}>Contact us</button>
      </div>

      {/* the WORK overlay — the R4 nav brought to life */}
      <div className={`hz-menu ${menu ? 'open' : ''}`} onClick={() => setMenu(false)}>
        <div className="hz-menu-inner" onClick={e => e.stopPropagation()}>
          <button className="hz-menu-x" onClick={() => setMenu(false)} aria-label="Close">Close ✕</button>
          <div className="hz-menu-kick">The work</div>
          <button className="hz-menu-row big" onClick={() => jump('work')}>
            <span className="hz-menu-t">See the work<i className="sq" /></span>
            <span className="hz-menu-sub">100+ projects shipped since 2020</span>
          </button>
          <div className="hz-menu-kick">What we make</div>
          {SERVICES.map(s => (
            <a key={s.href} className="hz-menu-row" href={s.href}>
              <span className="hz-menu-t">{s.t}</span>
              <span className="hz-menu-sub">{s.sub}</span>
            </a>
          ))}
          <div className="hz-menu-kick">By industry</div>
          {WORK_FILTERS.map(w => (
            <a key={w.href} className="hz-menu-row" href={w.href}>
              <span className="hz-menu-t">{w.t}</span>
            </a>
          ))}
          <div className="hz-menu-kick">Company</div>
          {ABOUT.map(a => (
            <a key={a.href} className="hz-menu-row" href={a.href}>
              <span className="hz-menu-t">{a.t}</span>
            </a>
          ))}
          <div className="hz-menu-kick">More</div>
          <button className="hz-menu-row" onClick={() => jump('story')}><span className="hz-menu-t">Our story</span></button>
          <button className="hz-menu-row" onClick={() => { setMenu(false); setBriefModalOpen(true); }}><span className="hz-menu-t">Start a conversation</span></button>
        </div>
      </div>
      <div className="chrome bot" aria-hidden="true">
        <span className="brand">Ahead</span>
        <span className="mid brand">of</span>
        <span className="brand">Market<i className="sq" /></span>
      </div>

      {/* 00 — THE OPENING (from /hear): the monogram is the only window into
          the footage; scroll zooms through it until the film goes full-bleed,
          then the stage scrolls away into the reel. */}
      <section className="hz" aria-label="Ahead of Market">
        <div className="hz-stage">
          <div className="hz-video">
            <div className="vid"><LazyGumlet id={HERO_REEL} eager filter="none" bleed={1.14} offsetY={-28} poster="transparent" /></div>
            <img className="pstr" src={poster(HERO_REEL)} alt="" />
          </div>
          <div className="hz-mask" ref={maskL}>
            <div className="wm" ref={wmA}><BrandMark kind="mono" /><span className="dot" /></div>
          </div>
          <div className="hz-gold" ref={goldL} aria-hidden="true">
            <div className="wm" ref={wmB}><BrandMark kind="mono" /><span className="dot" /></div>
          </div>
          {/* Branded sparkle stars fade in/out on mouse move in side areas */}
          {[...Array(4)].map((_, i) => {
            const isRight = i % 2 === 1;
            const top = 20 + (i % 2) * 45;
            return (
              <div
                key={i}
                ref={el => { if (el) sparkleRefs.current[i] = el; }}
                className="sparkle"
                style={{
                  [isRight ? 'right' : 'left']: 'clamp(1rem, 5vw, 3rem)',
                  top: `${top}%`,
                }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50,3 Q54.5,45.5 97,50 Q54.5,54.5 50,97 Q45.5,54.5 3,50 Q45.5,45.5 50,3 Z" fill="currentColor" />
                </svg>
              </div>
            );
          })}
          <div className="hz-chrome" ref={chromeL}>
            <p className="hz-intro">Hi. We're Ahead of Market — a storytelling company from <span style={{ whiteSpace: 'nowrap' }}>Phoenix, AZ.</span></p>
            <span className="hz-cue" />
          </div>
        </div>
      </section>

      {/* 01 — the claim (the r5 hero, now the landing after the zoom) */}
      <Slide>
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
          <span className="stat rv d4">Phoenix, AZ — Since 2020 · Scroll ↓</span>
        </div>
      </Slide>

      {/* 01 — STORY BEAT: the video company — backdrop cycles through portfolio posters */}
      <Slide id="story">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('${poster(PORTFOLIO[filmCyclePosterIndex].id, 1200)}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.08,
            pointerEvents: 'none',
            transition: 'background-image .5s ease-in-out',
            zIndex: 0
          }}
          aria-hidden="true"
        />
        <div className="stack">
          <div className="tags rv"><span>So — who are we, exactly?</span><span>Many companies around Phoenix know us as</span></div>
          <h2 className="title">
            <span className="row rv d1">A video</span>
            <span className="row rv d2">company<i className="sq" /></span>
          </h2>
          <p className="sub rv d3">Frames from our films — playing behind this.</p>
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
          <p className="sub rv d3">Sites we've built — standing behind this.</p>
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
          <p className="sub rv d3">— we just happen to make videos and web apps often.</p>
        </div>
      </Slide>

      {/* 05 — CASE: ISA Energy */}
      <Slide data-case="0">
        <div className="stack">
          <div className="tags rv"><span className="idx">01 / 04</span><span>Energy · Film</span><span>A demo, a validation study, a brand film</span></div>
          <h2 className="title">
            <span className="row rv d1">ISA</span>
            <span className="row rv d2">Energy<i className="sq" /></span>
          </h2>
          <p className="sub rv d3">A three-video series, now in every investor meeting.</p>
          <span className="stat rv d4">Helped raise a substantial round</span>
        </div>
      </Slide>

      {/* 06 — CASE: Space Rising */}
      <Slide data-case="1">
        <div className="stack">
          <div className="tags rv"><span className="idx">02 / 04</span><span>Tech · Platform</span><span>SpaceOS — built and launched</span></div>
          <h2 className="title">
            <span className="row rv d1">Space</span>
            <span className="row rv d2">Rising<i className="sq" /></span>
          </h2>
          <p className="sub rv d3">SpaceOS — and 1,000 people in one room at Space Congress.</p>
          <span className="stat rv d4">Drove a wave of traffic to the new platform</span>
        </div>
      </Slide>

      {/* 07 — CASE: Included Health */}
      <Slide data-case="2">
        <div className="stack">
          <div className="tags rv"><span className="idx">03 / 04</span><span>Healthcare · Film</span><span>A film series, screened nationwide</span></div>
          <h2 className="title">
            <span className="row rv d1">Included</span>
            <span className="row rv d2">Health<i className="sq" /></span>
          </h2>
          <p className="sub rv d3">Films for one of the largest insurers in the US.</p>
          <span className="stat rv d4">Produced for the Inspire Summit</span>
        </div>
      </Slide>

      {/* 08 — CASE: Ambition Mechanical */}
      <Slide data-case="3">
        <div className="stack">
          <div className="tags rv"><span className="idx">04 / 04</span><span>Trades · Web + Ads</span><span>The new site pulls its own weight</span></div>
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
          <div className="parts-head">Marketing — the materials your message stands on</div>
          <ul className="parts-list">
            <li><a className="parts-link" href="/services/web-build">Websites &amp; web applications <span className="arw">↗</span></a></li>
            <li><a className="parts-link" href="/services/brand-film">Brand films &amp; video series <span className="arw">↗</span></a></li>
            <li>Quizzes &amp; interactive tools for prospects</li>
            <li>Photography &amp; creative assets</li>
          </ul>
        </div>
        <div className="parts-col r rv">
          <div className="parts-head">Promotion — how it gets out into the world</div>
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
          <p className="sub rv d3">Marketing gets your story told. Promotion gets it seen.</p>
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

      {/* 11 — THE WORK: endless dual-row scroll */}
      <Slide id="work">
        <div className="mosaic">
          {/* Top row: scrolls left */}
          <div className="mosaic-row top">
            {[...PORTFOLIO, ...PORTFOLIO].map((v, i) => (
              <button key={`top-${i}`} className="tile" onClick={() => setVideo(v)} aria-label={`Play ${v.t}`}>
                <img src={poster(v.id, 400)} alt="" loading="lazy" />
                <span className="play">▶</span>
                <span className="tl">{v.t}</span>
              </button>
            ))}
          </div>
          {/* Bottom row: scrolls right */}
          <div className="mosaic-row bottom">
            {[...PORTFOLIO, ...PORTFOLIO].map((v, i) => (
              <button key={`bot-${i}`} className="tile" onClick={() => setVideo(v)} aria-label={`Play ${v.t}`}>
                <img src={poster(v.id, 400)} alt="" loading="lazy" />
                <span className="play">▶</span>
                <span className="tl">{v.t}</span>
              </button>
            ))}
          </div>
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
          <button className="btn-gold rv d4" onClick={() => setBriefModalOpen(true)} style={{ border: 'none', cursor: 'pointer' }}>Start a conversation</button>
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

      {/* brief modal */}
      <BriefModal open={briefModalOpen} onClose={() => setBriefModalOpen(false)} />
    </div>
  );
}
