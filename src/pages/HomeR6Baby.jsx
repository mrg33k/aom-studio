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
// Keep the two work-wall rows disjoint so a title can never repeat across them.
const PORTFOLIO_A = PORTFOLIO.filter((_, i) => i % 2 === 0);
const PORTFOLIO_B = PORTFOLIO.filter((_, i) => i % 2 === 1);
const TILE_VIDEO_BY_ID = {
  [PORTFOLIO[0].id]: '/videos/collage-01.mp4',
  [PORTFOLIO[3].id]: '/videos/collage-02.mp4',
  [PORTFOLIO[4].id]: '/videos/collage-03.mp4',
};

const HERO_REEL = '698a6296fc23d3d76fa8d992'; // Journey to Gary Vee — strongest doc footage
const FILM_REEL = '698a5ef5fc23d3d76fa87ef4'; // Virtu Hospitality
const BILL_REEL = '698a5fcdfc23d3d76fa893b8'; // United Food Bank — under the billboard line
const PALA_REEL = '698a5391fc23d3d76fa7306c'; // PA'LA x HARUMI
const NOOK_REEL = '698a5a8b873071aec5c99c6f'; // Nook 10 Year — clean frame for small screens

const N_SLIDES = 14;

// R23: Newer work reel (random-timed, randomized order)
const REEL_VIDEOS = Array.from({ length: 14 }, (_, i) => `/videos/reel-${String(i + 1).padStart(2, '0')}.mp4`);

// Helper to randomize reel order (Fisher-Yates shuffle)
const shuffleReel = () => {
  const arr = [...REEL_VIDEOS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Helper to get randomized interval (900-1800ms)
const randomInterval = () => 900 + Math.random() * 900;

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

// Local video wrapper used by the reels, collage, and work wall. Playback is
// gated to the visible section and disabled for reduced motion and phone layouts.
function InViewVideo({ src, className = '', style, posterSrc, preload = 'metadata', onPlaying, desktopOnly = false }) {
  const vidRef = useRef(null);

  useEffect(() => {
    const video = vidRef.current;
    if (!video) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width:641px)');
    let isInView = false;

    const syncPlayback = () => {
      const motionAllowed = !reduced.matches && (!desktopOnly || desktop.matches);
      if (isInView && motionAllowed) video.play().catch(() => {});
      else video.pause();
    };

    if (typeof IntersectionObserver === 'undefined') {
      isInView = true;
      syncPlayback();
      return undefined;
    }

    const obs = new IntersectionObserver(
      entries => {
        isInView = Boolean(entries[0]?.isIntersecting);
        syncPlayback();
      },
      { threshold: 0.12 }
    );
    obs.observe(video);
    reduced.addEventListener?.('change', syncPlayback);
    desktop.addEventListener?.('change', syncPlayback);

    return () => {
      obs.disconnect();
      reduced.removeEventListener?.('change', syncPlayback);
      desktop.removeEventListener?.('change', syncPlayback);
      video.pause();
    };
  }, [src, desktopOnly]);

  return (
    <video
      ref={vidRef}
      className={className}
      src={src}
      muted
      loop
      playsInline
      preload={preload}
      poster={posterSrc}
      onPlaying={onPlaying}
      style={style}
      aria-hidden="true"
    />
  );
}

function LivingSitePanel({ tallSrc, fallbackSrc, label }) {
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  const [source, setSource] = useState(tallSrc);
  const [isFallback, setIsFallback] = useState(false);
  const [panDistance, setPanDistance] = useState(0);

  const measure = useCallback(() => {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!frame || !image || isFallback) {
      setPanDistance(0);
      return;
    }
    setPanDistance(Math.max(0, image.scrollHeight - frame.clientHeight));
  }, [isFallback]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const handleError = () => {
    if (isFallback) return;
    setIsFallback(true);
    setSource(fallbackSrc);
  };

  return (
    <div className={`site-browser ${isFallback ? 'is-fallback' : 'is-tall'}`} aria-label={`${label} website preview`}>
      <div className="site-browser-bar" aria-hidden="true"><i /><i /><i /></div>
      <div className="site-browser-window" ref={frameRef}>
        <img
          ref={imageRef}
          className="site-page"
          src={source}
          alt=""
          loading="lazy"
          onLoad={measure}
          onError={handleError}
          style={{ '--site-pan': `${-panDistance}px` }}
        />
      </div>
    </div>
  );
}

// ─── BRIEF MODAL STATE & LOGIC ────────────────────────────────────────────

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xbdalqvg';
const INITIAL_BRIEF_FORM = { name: '', email: '', making: '', goal: '', budget: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function BriefModal({ open, onClose }) {
  const [step, setStep] = useState(0); // 0=name+email, 1=making, 2=goal
  const [formData, setFormData] = useState(INITIAL_BRIEF_FORM);
  const [status, setStatus] = useState('idle');
  const makingOptions = ['Brand film', 'Website', 'Strategy', 'Documentary', 'Not sure'];
  const totalSteps = 3;
  const progressWidth = ((step + 1) / totalSteps) * 100;
  const isContactValid = formData.name.trim() !== '' && EMAIL_PATTERN.test(formData.email.trim());

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const next = () => {
    if (step === 0 && !isContactValid) return;
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const handleClose = () => {
    if (status === 'sent') {
      setStep(0);
      setFormData(INITIAL_BRIEF_FORM);
      setStatus('idle');
    }
    onClose();
  };

  const submit = async () => {
    if (status === 'sending') return;
    if (!isContactValid) {
      setStep(0);
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          making: formData.making,
          goal: formData.goal,
          budget: formData.budget,
          source: 'r6-brief',
        }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (!open) return null;

  return (
    <div className="brief-modal" onClick={handleClose} role="dialog" aria-label="Creative brief">
      <div className="brief-modal-inner" onClick={e => e.stopPropagation()} style={{ '--progress-width': `${progressWidth}%` }}>
        <button className="brief-modal-x" onClick={handleClose} aria-label="Close">✕</button>

        {status === 'sent' ? (
          <div className="brief-confirmation" role="status">
            <h3>WE GOT IT.</h3>
            <p>We'll be in touch within 24 hours.</p>
          </div>
        ) : step === 0 ? (
          <div className="brief-step">
            <h3>Let's start with the basics</h3>
            <input
              type="text"
              placeholder="Your name"
              value={formData.name}
              onChange={e => updateForm('name', e.target.value)}
              required
              autoFocus
            />
            <input
              type="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={e => updateForm('email', e.target.value)}
              required
            />
            {formData.email.trim() !== '' && !EMAIL_PATTERN.test(formData.email.trim()) && (
              <p className="brief-error" role="alert">Enter a valid email address.</p>
            )}
            <button onClick={next} className="brief-next" disabled={!isContactValid}>Next</button>
          </div>
        ) : step === 1 ? (
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
            <button onClick={next} className="brief-next">Next</button>
          </div>
        ) : (
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
            <button onClick={submit} className="brief-next brief-submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Send'}
            </button>
            {status === 'error' && (
              <p className="brief-error" role="alert">Something went wrong. Try again or email us directly.</p>
            )}
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
/* touch (phone + iPad w/o mouse): keep mandatory snap so panels stay aligned, but
   drop the forced per-slide stop so momentum flings glide instead of hitching. */
@media (hover:none) and (pointer:coarse) {
  .r17 .slide { scroll-snap-stop:normal; }
}
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
.r17 .chrome span, .r17 .chrome a { pointer-events:auto; font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; text-shadow:0 1px 14px rgba(0,0,0,.75); font-family:var(--fbrut); }
.r17 .chrome a { transition:color .15s; }
.r17 .chrome a:hover { color:var(--gold); }
.r17 .chrome .mid { position:absolute; left:50%; transform:translateX(-50%); }
.r17 .chrome .brand { color:var(--paper); }
.r17 .chrome .brand .sq { width:.5em; height:.5em; margin-left:.45em; vertical-align:baseline; }
.r17 .chrome-link { pointer-events:auto; font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; text-shadow:0 1px 14px rgba(0,0,0,.75); color:var(--paper); transition:color .15s; padding:0; display:inline-flex; align-items:center; gap:.55rem; font-family:var(--fbrut); }
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
.r17 .hz-menu-sub { font-size:.95rem; color:var(--paper); margin-top:.3rem; font-family:var(--fbrut); font-weight:700; }

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
.r17 .bk-col.r { transform:translateY(calc(-13 * var(--vph,100svh))); }
.r17 .bk-panel { position:relative; width:100%; height:var(--vph,100svh); overflow:hidden; background:var(--ink); }
.r17 .bk-panel::after { content:''; position:absolute; inset:0; background:rgba(4,4,4,.44); z-index:2; }
.r17 .bk-panel > img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
@media(max-width:640px){
  .r17 .bk-win.l { width:100%; height:50%; border-right:none; border-bottom:1px solid var(--line); }
  .r17 .bk-win.r { left:0; right:auto; top:50%; width:100%; height:50%; }
  .r17 .bk-col.r { transform:translateY(calc(-13 * var(--vph,100svh) / 2)); }
  .r17 .bk-panel { height:calc(var(--vph,100svh) / 2); }
  .r17 .bk-panel::after { background:rgba(4,4,4,.55); }
  .r17 .tags { gap:.4rem; }
}

/* hero live reels: poster paints first, iframe loads over it; poster-only on
   small screens (Gumlet chrome shows at half-height) */
.r17 .bk-panel .pstr { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; }
.r17 .bk-panel .vid { position:absolute; inset:0; z-index:1; }
@media(max-width:640px){ .r17 .bk-panel .vid { display:none; } }

/* Living-site panels: tall captures pan through their full page. If the tall
   capture is unavailable, the landscape capture gets a restrained drift. */
.r17 .site-browser {
  position:absolute; inset:clamp(1rem,2.2vw,2rem); overflow:hidden;
  border:1px solid rgba(246,246,244,.32); border-radius:8px;
  background:var(--ink-2); box-shadow:0 20px 60px rgba(0,0,0,.42);
}
.r17 .site-browser-bar {
  position:absolute; z-index:3; left:0; right:0; top:0; height:30px;
  display:flex; align-items:center; gap:6px; padding:0 11px;
  background:rgba(6,6,6,.94); border-bottom:1px solid rgba(246,246,244,.18);
}
.r17 .site-browser-bar i { width:6px; height:6px; border-radius:50%; background:rgba(246,246,244,.48); }
.r17 .site-browser-bar i:first-child { background:var(--gold); }
.r17 .site-browser-window { position:absolute; inset:30px 0 0; overflow:hidden; background:var(--ink-2); }
.r17 .site-page { position:absolute; left:0; top:0; display:block; width:100%; max-width:none; will-change:transform; }
.r17 .site-browser.is-tall .site-page {
  height:auto; min-height:100%;
  animation:site-page-pan 22s cubic-bezier(.45,.05,.55,.95) infinite;
}
.r17 .site-browser.is-fallback .site-page {
  width:100%; height:100%; object-fit:cover;
  animation:site-page-drift 22s ease-in-out infinite alternate;
}
@keyframes site-page-pan {
  0%, 8% { transform:translate3d(0,0,0); }
  47%, 58% { transform:translate3d(0,var(--site-pan),0); }
  100% { transform:translate3d(0,0,0); }
}
@keyframes site-page-drift {
  0% { transform:translate3d(-1.5%,0,0) scale(1.06); }
  50% { transform:translate3d(1.5%,-1.5%,0) scale(1.1); }
  100% { transform:translate3d(-1%,1.5%,0) scale(1.14); }
}
@media(max-width:640px){
  .r17 .site-browser { inset:.65rem; }
  .r17 .site-browser.is-tall .site-page,
  .r17 .site-browser.is-fallback .site-page { animation:none; transform:none; }
}

/* ghost-type texture panel (solid panel, outlined repeating line) */
.r17 .ghostpanel { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; gap:.4em; overflow:hidden; }
.r17 .ghostpanel span {
  font-family:var(--fd); font-weight:800; text-transform:uppercase; white-space:nowrap;
  font-size:clamp(2.2rem,5.5vw,4.6rem); line-height:1; letter-spacing:-.01em;
  color:transparent; -webkit-text-stroke:1px rgba(246,246,244,.22); text-align:center;
  will-change:transform; animation:ghost-drift 12s ease-in-out infinite;
}
.r17 .ghostpanel span:nth-child(odd) { transform:translateX(-4%); animation-delay:-3s; }
.r17 .ghostpanel span:nth-child(even) { transform:translateX(4%); animation-delay:-6s; }
.r17 .ghostpanel span.solid { color:rgba(196,164,106,.5); -webkit-text-stroke:0; }
@keyframes ghost-drift {
  0%, 100% { transform:translateX(0); }
  25% { transform:translateX(-2%); }
  50% { transform:translateX(0); }
  75% { transform:translateX(2%); }
}

/* ─── hear hero: runway + sticky stage, monogram as the window into footage ─── */
.r17 .hz { position:relative; height:calc(${RUNWAY_VH} * var(--vph,100svh)); scroll-snap-align:start; z-index:2; }
/* isolation + own compositor layer: multiply must blend against THIS stage only —
   without it Chrome can drop the blend mid-scroll in a sticky ancestor and the
   mark flashes solid (Patrik's scroll-back-to-top bug) */
.r17 .hz-stage { position:sticky; top:0; height:var(--vph,100svh); overflow:hidden; background:var(--ink); isolation:isolate; transform:translateZ(0); }
.r17 .hz-video { position:absolute; inset:0; }
.r17 .hz-video .pstr {
  position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:2;
  opacity:1; pointer-events:none; transition:opacity 250ms ease;
}
.r17 .hz-video .pstr.is-hidden { opacity:0; }
.r17 .hz-video .vid { position:absolute; inset:0; z-index:1; }
@media(max-width:640px){
  .r17 .hz-video .vid { display:none; }
  .r17 .hz-video .pstr.is-hidden { opacity:1; }
}
.r17 .hz-mask {
  position:absolute; inset:0; z-index:3; background:#000; mix-blend-mode:multiply;
  display:flex; align-items:center; justify-content:center;
  will-change:opacity;
}
.r17 .hz-gold { position:absolute; inset:0; z-index:4; pointer-events:none; display:flex; align-items:center; justify-content:center; }
.r17 .hz .wm { display:flex; align-items:flex-end; white-space:nowrap; transform-origin:55% 30%; color:#fff; }
.r17 .hz .wm svg { display:block; height:min(68vh,72vw); width:auto; }
@media(max-width:640px){ .r17 .hz .wm svg { height:min(40vh,74vw); } }
.r17 .hz-gold .wm { color:#F6F6F4; }
.r17 .hz-gold .wm svg { opacity:.09; }
.r17 .hz-chrome { position:absolute; inset:0; z-index:5; pointer-events:none; }
.r17 .hz-intro {
  position:absolute; left:50%; transform:translateX(-50%);
  bottom:calc(clamp(4.5rem,10vh,7rem) + env(safe-area-inset-bottom));
  width:min(48rem,88vw); text-align:center; padding:1rem clamp(1rem,3vw,2.4rem);
  font-size:clamp(1.5rem,2.6vw,2.4rem); color:var(--paper); line-height:1.06;
  font-family:var(--fbrut); font-weight:800; letter-spacing:-.035em;
  text-shadow:0 3px 24px rgba(0,0,0,.96), 0 1px 4px rgba(0,0,0,1);
  background:radial-gradient(ellipse at center, rgba(4,4,4,.74) 0%, rgba(4,4,4,.38) 52%, transparent 76%);
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
@media(max-width:640px){
  .r17 .hz-intro { width:min(90vw,30rem); font-size:clamp(1.25rem,6vw,1.65rem); line-height:1.08; padding:.8rem 1rem; }
}

/* branded sparkle star reveals on mouse move + ambient twinkle (R24: richer constellation) */
.r17 .sparkle { position:absolute; z-index:2; color:var(--gold); opacity:0; transition:opacity .4s ease; pointer-events:none; display:flex; align-items:center; justify-content:center; }
.r17 .sparkle svg { width:100%; height:100%; display:block; }
/* ambient sparkles: always faintly visible with gentle twinkle */
.r17 .sparkle.ambient { opacity:0.08; animation:sparkle-twinkle 3s ease-in-out infinite; }
.r17 .sparkle.ambient.s1 { animation-delay:0s; }
.r17 .sparkle.ambient.s2 { animation-delay:0.6s; }
.r17 .sparkle.ambient.s3 { animation-delay:1.2s; }
.r17 .sparkle.ambient.s4 { animation-delay:1.8s; }
@keyframes sparkle-twinkle { 0%, 100% { opacity:0.08; } 50% { opacity:0.16; } }
/* interactive sparkles: hidden by default, reveal on mouse (fine pointer only) */
.r17 .sparkle.interactive { opacity:0; }
@media (prefers-reduced-motion:reduce){ .r17 .sparkle.interactive { display:none; } }

/* ─── slides: type only, transparent over the backdrop ─── */
.r17 .slide {
  position:relative; height:var(--vph,100svh); scroll-snap-align:start; scroll-snap-stop:always;
  overflow:hidden; background:transparent; z-index:1;
  display:flex; align-items:center; justify-content:center;
}

/* center stack */
.r17 .stack { position:relative; z-index:3; display:flex; flex-direction:column; align-items:center; text-align:center; padding:0 var(--pad); max-width:100%; }
.r17 .stack::before { content:''; position:absolute; inset:0; z-index:-1; background:radial-gradient(ellipse at center, rgba(4,4,4,.55), transparent 70%); pointer-events:none; }
.r17 .story-reel { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:.62; pointer-events:none; z-index:0; }
.r17 .story-poster { display:none; position:absolute; inset:0; width:100%; height:100%; max-width:none; object-fit:cover; opacity:.58; z-index:0; }
.r17 .story-slide::after,
.r17 .billboard-slide::after {
  content:''; position:absolute; inset:0; z-index:1; pointer-events:none;
  background:radial-gradient(ellipse at center, rgba(4,4,4,.16) 0%, rgba(4,4,4,.48) 72%), linear-gradient(to top, rgba(4,4,4,.68), transparent 62%);
}
@media(max-width:640px){
  .r17 .story-reel { display:none; }
  .r17 .story-poster { display:block; }
}
.r17 .tags { display:flex; flex-direction:column; gap:.28rem; margin-bottom:1.1rem; }
.r17 .tags span { font-size:.9rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--paper); text-shadow:0 1px 14px rgba(0,0,0,.9); font-family:var(--fbrut); }
.r17 .tags .idx { font-size:.95rem; font-weight:700; letter-spacing:.3em; margin-bottom:.3rem; font-family:var(--fd); }
.r17 #contact .tags > span:first-child { font-size:.95rem; font-weight:700; }
.r17 .title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(3.1rem,9.2vw,9.2rem); line-height:.9; letter-spacing:-.02em;
  text-shadow:0 3px 44px rgba(0,0,0,.55);
}
.r17 .title .row { display:block; }
.r17 .title .gold { color:var(--gold); }
.r17 .sub { margin-top:1.3rem; font-size:clamp(1.15rem,2vw,1.4rem); color:var(--paper); opacity:1; max-width:52ch; text-shadow:0 1px 16px rgba(0,0,0,.7); font-family:var(--fbrut); font-weight:700; letter-spacing:-.01em; }
.r17 .stat { margin-top:.55rem; font-size:.95rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--paper); text-shadow:0 1px 12px rgba(0,0,0,.7); font-family:var(--fbrut); }
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
  will-change:opacity,transform; opacity:1; transition:opacity .5s ease;
}
.r17 .ghost-word.fade-out { opacity:0; }
@keyframes ghost-float {
  0%, 100% { transform:translate(-50%,-50%) translateY(0); }
  50% { transform:translate(-50%,-50%) translateY(-8px); }
}

/* two parts — R25: clean vertical composition. Title block on top, the two lists
   as a real side-by-side grid below (was three absolute layers that collided on
   tablet). Prominent, readable, no overlap at any width. */
.r17 .slide-parts .parts-wrap { position:relative; z-index:3; width:min(1120px,92vw); margin:0 auto; display:flex; flex-direction:column; align-items:center; gap:clamp(1.6rem,4vh,3rem); padding:0 var(--pad); }
.r17 .parts-intro { display:flex; flex-direction:column; align-items:center; text-align:center; }
.r17 .slide-parts .title { font-size:clamp(2.8rem,7vw,6rem); }
.r17 .parts-grid { display:grid; grid-template-columns:1fr 1fr; gap:clamp(1.5rem,5vw,4.5rem); width:100%; }
.r17 .parts-col { text-align:left; }
.r17 .parts-head { font-size:clamp(1.05rem,1.6vw,1.35rem); font-weight:800; letter-spacing:-.01em; text-transform:uppercase; color:var(--paper); margin-bottom:.7rem; font-family:var(--fd); position:relative; padding-top:2.6rem; line-height:1.25; }
.r17 .parts-head::before { content:attr(data-num); position:absolute; left:0; top:0; font-size:clamp(1.8rem,3vw,2.6rem); color:rgba(196,164,106,.55); font-weight:800; line-height:1; letter-spacing:-.02em; font-family:var(--fd); }
.r17 .parts-list { list-style:none; display:flex; flex-direction:column; gap:0; }
.r17 .parts-list li { font-size:clamp(1rem,1.4vw,1.2rem); color:var(--paper); line-height:1.5; border-bottom:1px solid var(--line); padding:.85rem 0 .85rem .6rem; font-family:var(--fbrut); font-weight:700; transition:color .2s, padding-left .2s; position:relative; }
.r17 .parts-list li::before { content:'✓'; position:absolute; left:0; color:var(--gold); opacity:0; font-weight:700; transition:opacity .2s; }
.r17 .parts-list li:hover { color:var(--gold); padding-left:.8rem; }
.r17 .parts-list li:hover::before { opacity:1; }
.r17 .parts-list li:first-child { border-top:1px solid var(--line); }
.r17 .parts-list li:last-child { border-bottom:none; }
@media(max-width:640px){
  /* phone: fit the whole section (title + 8 items) inside one viewport so the
     scroll-snap slide never clips the last row under the bottom chrome. */
  .r17 .slide-parts .parts-wrap { gap:1rem; }
  .r17 .parts-grid { grid-template-columns:1fr; gap:.6rem; }
  .r17 .parts-head { padding-top:1.8rem; margin-bottom:.3rem; font-size:.92rem; }
  .r17 .parts-head::before { font-size:1.5rem; }
  .r17 .parts-list li { font-size:.9rem; padding:.5rem 0 .5rem .6rem; line-height:1.35; }
  .r17 .slide-parts .title { font-size:clamp(2rem,8vw,3.1rem); }
  .r17 .slide-parts .sub { font-size:1rem; margin-top:.7rem; max-width:34ch; }
  .r17 .ghost-mark { color:rgba(196,164,106,.16); }
}

/* Billboard montage: one cohesive wall with staggered, transform-only life. */
.r17 .billboard-montage { position:absolute; inset:0; display:grid; grid-template-columns:repeat(6, 1fr); grid-template-rows:repeat(4, 1fr); gap:0.6rem; padding:1.6rem; opacity:.68; z-index:0; pointer-events:none; }
@media(max-width:640px) {
  .r17 .billboard-montage { grid-template-columns:repeat(3, 1fr); grid-template-rows:repeat(3, 1fr); gap:0.4rem; padding:0.8rem; }
  .r17 .billboard-item { animation:none; transform:none; }
  .r17 .billboard-item video { display:none; }
}
.r17 .billboard-item {
  position:relative; overflow:hidden; border-radius:2px; background:var(--ink-2); opacity:.76;
  animation:billboard-life 15s ease-in-out infinite alternate; will-change:transform,opacity;
}
.r17 .billboard-item.is-video { grid-row:span 2; opacity:1; animation-name:billboard-video-life; }
.r17 .billboard-item:nth-child(3n+1) { animation-delay:-3s; }
.r17 .billboard-item:nth-child(3n+2) { animation-delay:-8s; animation-direction:alternate-reverse; }
.r17 .billboard-item:nth-child(3n) { animation-delay:-12s; }
.r17 .billboard-item img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.r17 .billboard-item video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
@keyframes billboard-life {
  0% { transform:scale(1.02) translate3d(-.6%,0,0); opacity:.68; }
  52% { transform:scale(1.08) translate3d(.7%,-.5%,0); opacity:.92; }
  100% { transform:scale(1.04) translate3d(0,.6%,0); opacity:.76; }
}
@keyframes billboard-video-life {
  0% { transform:scale(1.015) translate3d(-.4%,0,0); }
  52% { transform:scale(1.055) translate3d(.5%,-.4%,0); }
  100% { transform:scale(1.025) translate3d(0,.4%,0); }
}
@media(max-width:640px) {
  .r17 .billboard-item { animation:none; transform:none; }
}

/* work mosaic — endless dual-row scroll. R25: rows are width:max-content so the
   marquee translates by a full copy (was -66% of the 768px viewport, which only
   shuffled ~500px and never looped in cohesion). Tiles fill the row height edge
   to edge so there are no black gaps. */
.r17 .mosaic { position:absolute; inset:0; display:flex; flex-direction:column; gap:0.55rem; padding:0.55rem 0; overflow:hidden; }
.r17 .mosaic-row { display:flex; width:max-content; gap:0.55rem; height:calc(50% - 0.28rem); }
.r17 .mosaic-row.top { animation:mosaic-scroll-left 55s linear infinite; }
.r17 .mosaic-row.bottom { animation:mosaic-scroll-right 55s linear infinite; }
.r17 .mosaic-row:hover { animation-play-state:paused; }
@keyframes mosaic-scroll-left {
  0% { transform:translateX(0); }
  100% { transform:translateX(-33.333%); }
}
@keyframes mosaic-scroll-right {
  0% { transform:translateX(-33.333%); }
  100% { transform:translateX(0); }
}
.r17 .tile { position:relative; overflow:hidden; background:var(--ink-2); border:none; padding:0; flex-shrink:0; height:100%; width:34vw; min-width:215px; cursor:pointer; }
.r17 .tile img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:.62; transform:scale(1.04); transition:opacity .4s, transform .6s cubic-bezier(.16,1,.3,1); }
.r17 .tile .tile-video { position:absolute; inset:0; z-index:1; width:100%; height:100%; object-fit:cover; opacity:.78; transform:scale(1.04); transition:opacity .4s, transform .6s cubic-bezier(.16,1,.3,1); }
.r17 .tile:hover img { opacity:1; transform:scale(1.01); }
.r17 .tile:hover .tile-video { opacity:1; transform:scale(1.01); }
.r17 .tile .tl { position:absolute; left:.9rem; bottom:.8rem; z-index:2; font-size:.62rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--paper); text-shadow:0 1px 10px rgba(0,0,0,.8); opacity:0; transition:opacity .3s; }
.r17 .tile:hover .tl { opacity:1; }
.r17 .tile .play { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:3; font-size:2.4rem; color:var(--paper); text-shadow:0 2px 12px rgba(0,0,0,.8); opacity:0; transition:opacity .3s; }
.r17 .tile:hover .play { opacity:1; }
@media(max-width:640px){
  .r17 .tile { width:44vw; min-width:150px; }
  .r17 .tile .tile-video { display:none; }
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
.r17 .brief-confirmation { animation:brief-fade-in .2s ease; text-align:center; padding:2rem 0; }
.r17 .brief-confirmation h3 { font-family:var(--fd); font-size:1.8rem; font-weight:800; color:var(--paper); line-height:1.1; letter-spacing:-.01em; margin-bottom:.8rem; }
.r17 .brief-confirmation p { font-family:var(--fbrut); font-size:.95rem; color:var(--mut); }
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
.r17 .brief-error { margin-top:.8rem; color:#E99A8F; font-family:var(--fbrut); font-size:.82rem; line-height:1.4; }
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
  .r17 .hz-video .vid, .r17 .story-reel, .r17 .tile .tile-video, .r17 .billboard-item video { display:none; }
  .r17 .story-poster { display:block; }
  .r17 .hz-video .pstr.is-hidden { opacity:1; }
  .r17 .site-page, .r17 .billboard-item, .r17 .mosaic-row { animation:none !important; transform:none !important; }
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
    null,
    <LivingSitePanel tallSrc="/hero-sites/ambition-tall.jpg" fallbackSrc="/hero-sites/ambition.jpg" label="Ambition Mechanical" />,
    null,
    null,
    <CaseVideo src="/videos/isa-brand.mp4" posterSrc="/videos/isa-brand.jpg" caseIndex={0} />,
    <CaseVideo src="/videos/spacerising-render.mp4" posterSrc="/videos/spacerising-render.jpg" caseIndex={1} />,
    <CaseVideo src="/videos/ih-culture.mp4" posterSrc="/videos/ih-culture.jpg" caseIndex={2} />,
    <LivingSitePanel tallSrc="/hero-sites/ambition-tall.jpg" fallbackSrc="/hero-sites/ambition.jpg" label="Ambition Mechanical" />,
    null,
    null,
    null,
    null,
    null,
  ];

  const RIGHT_PANELS = [
    <>
      <div className="vid"><LazyGumlet id={FILM_REEL} eager filter="none" bleed={1.14} offsetY={-28} poster="transparent" /></div>
      <img className="pstr" src={poster(NOOK_REEL)} alt="" />
    </>,
    null,
    <LivingSitePanel tallSrc="/hero-sites/space-rising-tall.jpg" fallbackSrc="/hero-sites/space-rising.jpg" label="Space Rising" />,
    null,
    null,
    <CaseVideo src="/videos/isa-demo.mp4" posterSrc="/videos/isa-demo.jpg" caseIndex={0} />,
    <CaseVideo src="/videos/spacerising-event.mp4" posterSrc="/videos/spacerising-event.jpg" caseIndex={1} />,
    <CaseVideo src="/videos/ih-life.mp4" posterSrc="/videos/ih-life.jpg" caseIndex={2} />,
    <CaseVideo src="/videos/ambition-vertical.mp4" posterSrc="/videos/ambition-vertical.jpg" caseIndex={3} />,
    null,
    null,
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

const CASE_STUDIES = [
  { t: 'ISA Energy', href: '/work/isa-energy', sub: 'Investor-grade film series for quantum energy startup' },
  { t: 'Included Health', href: '/work/included-health', sub: 'Client summit coverage and SME video content' },
  { t: 'Ambition Mechanical', href: '/work/ambition-mechanical', sub: 'Brand film and marketing for HVAC leader' },
  { t: 'PA\'LA', href: '/work/pala', sub: 'Wood-fired cooking restaurant brand and social content' },
  { t: 'Kohrs', href: '/work/kohrs', sub: 'Construction and renovation social content retainer' },
  { t: 'Intelliplay', href: '/work/intelliplay', sub: 'Product demo film for tech and gaming platform' },
  { t: 'Space Rising', href: '/work/space-rising', sub: 'SpaceOS directory platform for space economy' },
  { t: 'Brandon Wiley', href: '/work/brandon-wiley', sub: 'Long-form founder documentary' },
  { t: 'Virtu Hospitality', href: '/work/virtu-hospitality', sub: 'Brand film about hospitality leadership' },
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
  const [ghostWordIndices, setGhostWordIndices] = useState({ neither: 0, voices: 0 });
  const [heroReelSrc, setHeroReelSrc] = useState(REEL_VIDEOS[0]);
  const [heroHasPlayed, setHeroHasPlayed] = useState(false);
  const [storyReelSrc, setStoryReelSrc] = useState(REEL_VIDEOS[0]);

  const ghostWordSets = {
    neither: ['NEITHER', 'BALANCED', 'HYBRID'],
    voices: ['VOICES', 'STORIES', 'PROOF'],
  };

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
      // Lock every full-height section to the real scroller height. On iOS Safari
      // `100svh` under-fills a position:fixed scroller (svh < the fixed box), which
      // left a sliver of the next slide showing and made snap points misalign
      // ("doesn't fill the screen / scrolls weird"). Pin to px instead.
      if (box.__vph !== H) { box.__vph = H; box.style.setProperty('--vph', H + 'px'); }
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
      && window.matchMedia('(min-width:641px)').matches
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

  // R24: Sparkle stars — ambient always visible, interactive reveal on mouse in side areas (fine pointers, large screens only)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const ok = window.matchMedia('(pointer:fine)').matches
      && window.matchMedia('(min-width:641px)').matches
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
        // Ambient sparkles (0-3): always visible, no mouse interaction
        // Interactive sparkles (4+): reveal on mouse in side areas
        if (i < 4) return; // ambient sparkles stay as-is
        const isInteractive = ref.classList.contains('interactive');
        const isAmbient = ref.classList.contains('ambient');
        if (isAmbient) return; // skip ambient
        // Interactive sparkle reveal based on side
        const shouldShow = (isLeftSide && i % 2 === 0) || (isRightSide && i % 2 === 1);
        if (shouldShow) nextActive.add(i);
        ref.style.opacity = shouldShow ? '1' : '0';
      });
      sparkleState.current.activeSparkles = nextActive;
    };
    stage.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => stage.removeEventListener('mousemove', onMouseMove);
  }, []);

  // R28: Preload each next hero clip before the random-timed, in-view swap.
  useEffect(() => {
    const heroSection = document.querySelector('.r17 .hz');
    if (!heroSection || typeof IntersectionObserver === 'undefined') return;
    let timer;
    let preloader;
    let active = false;
    let reelQueue = shuffleReel();
    let reelIdx = 0;
    let currentSrc = REEL_VIDEOS[0];

    const releasePreloader = () => {
      if (!preloader) return;
      preloader.oncanplay = null;
      preloader.onerror = null;
      preloader.removeAttribute('src');
      preloader.load();
      preloader = null;
    };

    const schedule = () => {
      if (!active) return;
      let nextSrc;
      do {
        if (reelIdx >= reelQueue.length) {
          reelQueue = shuffleReel();
          reelIdx = 0;
        }
        nextSrc = reelQueue[reelIdx];
        reelIdx++;
      } while (nextSrc === currentSrc);
      let ready = false;
      let due = false;
      let committed = false;

      const commit = () => {
        if (!active || committed) return;
        committed = true;
        currentSrc = nextSrc;
        setHeroReelSrc(nextSrc);
        releasePreloader();
        schedule();
      };

      preloader = document.createElement('video');
      preloader.preload = 'auto';
      preloader.muted = true;
      preloader.loop = true;
      preloader.playsInline = true;
      preloader.oncanplay = () => {
        ready = true;
        if (due) commit();
      };
      preloader.onerror = () => {
        ready = true;
        if (due) commit();
      };
      preloader.src = nextSrc;
      preloader.load();

      timer = setTimeout(() => {
        due = true;
        if (ready) commit();
      }, randomInterval());
    };

    const obs = new IntersectionObserver(
      es => {
        const isInView = es[0]?.isIntersecting;
        if (isInView && !active) {
          active = true;
          schedule();
        } else if (!isInView && active) {
          active = false;
          clearTimeout(timer);
          releasePreloader();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(heroSection);
    return () => {
      active = false;
      obs.disconnect();
      clearTimeout(timer);
      releasePreloader();
    };
  }, []);

  // R23: Story reel — random-timed cycling through reel-01..14.mp4, inView-gated
  useEffect(() => {
    const storySlide = document.getElementById('story');
    if (!storySlide || typeof IntersectionObserver === 'undefined') return;
    let raf;
    let reelQueue = shuffleReel();
    let reelIdx = 0;
    const obs = new IntersectionObserver(
      es => {
        const isInView = es[0]?.isIntersecting;
        if (isInView) {
          const cycle = () => {
            if (reelIdx >= reelQueue.length) {
              reelQueue = shuffleReel();
              reelIdx = 0;
            }
            setStoryReelSrc(reelQueue[reelIdx]);
            reelIdx++;
            raf = setTimeout(() => cycle(), randomInterval());
          };
          raf = setTimeout(() => cycle(), randomInterval());
        } else {
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

  // Ghost-word cycling: cycle through word sets when in view, inView-gated
  useEffect(() => {
    const ghostWords = document.querySelectorAll('.r17 .ghost-word');
    if (!ghostWords.length || typeof IntersectionObserver === 'undefined') return;

    const rafMap = new Map();
    const obs = new IntersectionObserver(
      es => {
        es.forEach(e => {
          const el = e.target;
          const isInView = e.isIntersecting;
          const key = el.textContent || 'default';

          if (isInView) {
            if (!rafMap.has(key)) {
              let idx = 0;
              const cycle = () => {
                const wordSet = ghostWordSets[key] || [key];
                el.textContent = wordSet[idx % wordSet.length];
                el.classList.add('in-view');
                idx++;
                const raf = setTimeout(cycle, 4000);
                rafMap.set(key, raf);
              };
              cycle();
            }
          } else {
            if (rafMap.has(key)) {
              clearTimeout(rafMap.get(key));
              rafMap.delete(key);
              el.classList.remove('in-view');
            }
          }
        });
      },
      { threshold: 0.2 }
    );

    ghostWords.forEach(el => obs.observe(el));
    return () => {
      obs.disconnect();
      rafMap.forEach(raf => clearTimeout(raf));
      rafMap.clear();
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
          <a className="hz-menu-row" href="/work">
            <span className="hz-menu-t">Browse all work</span>
            <span className="hz-menu-sub">Complete hub of case studies and industries</span>
          </a>
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
          <div className="hz-menu-kick">Case studies</div>
          {CASE_STUDIES.map(c => (
            <a key={c.href} className="hz-menu-row" href={c.href}>
              <span className="hz-menu-t">{c.t}</span>
              <span className="hz-menu-sub">{c.sub}</span>
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
          then the stage scrolls away into the reel. R23: now uses random-timed
          reel of newer work (MALPAI, NGOTS, AISIY) instead of single Gumlet. */}
      <section className="hz" aria-label="Ahead of Market">
        <div className="hz-stage">
          <div className="hz-video">
            <InViewVideo
              className="vid"
              src={heroReelSrc}
              preload="auto"
              desktopOnly
              onPlaying={() => setHeroHasPlayed(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <img className={`pstr ${heroHasPlayed ? 'is-hidden' : ''}`} src="/videos/hero-poster.jpg" alt="" />
          </div>
          <div className="hz-mask" ref={maskL}>
            <div className="wm" ref={wmA}><BrandMark kind="mono" /></div>
          </div>
          <div className="hz-gold" ref={goldL} aria-hidden="true">
            <div className="wm" ref={wmB}><BrandMark kind="mono" /></div>
          </div>
          {/* R24: Richer sparkle constellation — ambient + interactive stars scattered in side areas */}
          {/* Ambient sparkles (4): always faintly visible with twinkle */}
          {[
            { side: 'left', top: 15, size: 'clamp(1.8rem,2.8vw,3rem)', ambientClass: 's1' },
            { side: 'right', top: 25, size: 'clamp(2rem,3.2vw,3.5rem)', ambientClass: 's2' },
            { side: 'left', top: 60, size: 'clamp(1.5rem,2.4vw,2.6rem)', ambientClass: 's3' },
            { side: 'right', top: 75, size: 'clamp(1.9rem,3vw,3.2rem)', ambientClass: 's4' },
          ].map((star, i) => (
            <div
              key={`ambient-${i}`}
              ref={el => { if (el) sparkleRefs.current[i] = el; }}
              className={`sparkle ambient ${star.ambientClass}`}
              style={{
                [star.side]: 'clamp(0.8rem, 4vw, 2.5rem)',
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M50,3 Q54.5,45.5 97,50 Q54.5,54.5 50,97 Q45.5,54.5 3,50 Q45.5,45.5 50,3 Z" fill="currentColor" />
              </svg>
            </div>
          ))}
          {/* Interactive sparkles (8): hidden by default, reveal on mouse move in side areas */}
          {[
            { side: 'left', top: 10, size: 'clamp(1.2rem,2vw,2.4rem)' },
            { side: 'left', top: 35, size: 'clamp(1.4rem,2.2vw,2.8rem)' },
            { side: 'left', top: 70, size: 'clamp(1.1rem,1.8vw,2.2rem)' },
            { side: 'left', top: 88, size: 'clamp(1.3rem,2.1vw,2.6rem)' },
            { side: 'right', top: 18, size: 'clamp(1.3rem,2.1vw,2.6rem)' },
            { side: 'right', top: 42, size: 'clamp(1.2rem,1.9vw,2.4rem)' },
            { side: 'right', top: 62, size: 'clamp(1.4rem,2.3vw,2.8rem)' },
            { side: 'right', top: 82, size: 'clamp(1.1rem,1.7vw,2.2rem)' },
          ].map((star, i) => (
            <div
              key={`interactive-${i}`}
              ref={el => { if (el) sparkleRefs.current[4 + i] = el; }}
              className="sparkle interactive"
              style={{
                [star.side]: 'clamp(0.8rem, 4vw, 2.5rem)',
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M50,3 Q54.5,45.5 97,50 Q54.5,54.5 50,97 Q45.5,54.5 3,50 Q45.5,45.5 50,3 Z" fill="currentColor" />
              </svg>
            </div>
          ))}
          <div className="hz-chrome" ref={chromeL}>
            <p className="hz-intro">Hi. We're Ahead of Market, a storytelling company from <span style={{ whiteSpace: 'nowrap' }}>Phoenix, AZ.</span></p>
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
          <span className="stat rv d4">Phoenix, AZ · Since 2020 · Scroll ↓</span>
        </div>
      </Slide>

      {/* 01 — STORY BEAT: the video company — R23: backdrop now cycles through random reel of newer work */}
      <Slide id="story" className="story-slide">
        <InViewVideo
          className="story-reel"
          src={storyReelSrc}
          preload="metadata"
          desktopOnly
        />
        <img className="story-poster" src="/videos/hero-poster.jpg" alt="" aria-hidden="true" />
        <div className="stack">
          <div className="tags rv"><span>So, who are we, exactly?</span><span>Many companies around Phoenix know us as</span></div>
          <h2 className="title">
            <span className="row rv d1">A video</span>
            <span className="row rv d2">company<i className="sq" /></span>
          </h2>
          <p className="sub rv d3">Clips from our newer work, playing behind this.</p>
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
          <p className="sub rv d3">We just happen to make videos and web apps, often.</p>
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
          <div className="tags rv"><span className="idx">02 / 04</span><span>Tech · Platform</span><span>SpaceOS, built and launched</span></div>
          <h2 className="title">
            <span className="row rv d1">Space</span>
            <span className="row rv d2">Rising<i className="sq" /></span>
          </h2>
          <p className="sub rv d3">SpaceOS, and 1,000 people in one room at Space Congress.</p>
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
        <div className="parts-wrap">
          <div className="parts-intro">
            <div className="tags rv"><span>What we actually do</span><span>Everything we make falls into</span></div>
            <h2 className="title">
              <span className="row rv d1">Two</span>
              <span className="row rv d2">parts<i className="sq" /></span>
            </h2>
            <p className="sub rv d3">Marketing gets your story told. Promotion gets it seen.</p>
          </div>
          <div className="parts-grid rv d4">
            <div className="parts-col l">
              <div className="parts-head" data-num="01">Marketing: the materials your message stands on</div>
              <ul className="parts-list">
                <li><a className="parts-link" href="/services/web-build">Websites &amp; web applications <span className="arw">↗</span></a></li>
                <li><a className="parts-link" href="/services/brand-film">Brand films &amp; video series <span className="arw">↗</span></a></li>
                <li>Quizzes &amp; interactive tools for prospects</li>
                <li>Photography &amp; creative assets</li>
              </ul>
            </div>
            <div className="parts-col r">
              <div className="parts-head" data-num="02">Promotion: how it gets out into the world</div>
              <ul className="parts-list">
                <li>Google &amp; Meta ad campaigns</li>
                <li>Influencer posts &amp; partnerships</li>
                <li>Email &amp; text-message campaigns</li>
                <li>SEO &amp; content distribution</li>
              </ul>
            </div>
          </div>
        </div>
      </Slide>

      {/* 10 — THE BILLBOARD TEST */}
      {/* R23: Upgraded to moving collage mixing collage videos (01-03), newer-work stills (04-08), and portfolio posters */}
      <Slide className="billboard-slide">
        <div className="billboard-montage" aria-hidden="true">
          {/* Collage videos (loops) */}
          {[1, 2, 3].map(i => (
            <div key={`collage-vid-${i}`} className="billboard-item is-video">
              <img src={poster(PORTFOLIO[i - 1].id, 500)} alt="" loading="lazy" />
              <InViewVideo
                src={`/videos/collage-0${i}.mp4`}
                preload="metadata"
                desktopOnly
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
          {/* Collage stills (newer work) */}
          {[4, 5, 6, 7, 8].map(i => (
            <div key={`collage-still-${i}`} className="billboard-item">
              <img src={`/videos/collage-0${i}.jpg`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
          {/* Mix in portfolio posters */}
          {PORTFOLIO.map((v, i) => (
            <div key={`billboard-${i}`} className="billboard-item">
              <img src={poster(v.id, 300)} alt="" loading="lazy" />
            </div>
          ))}
          {/* Additional portfolio for visual density */}
          {PORTFOLIO.slice(0, 3).map((v, i) => (
            <div key={`billboard-extra-${i}`} className="billboard-item">
              <img src={poster(v.id, 300)} alt="" loading="lazy" />
            </div>
          ))}
        </div>
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
            {[...PORTFOLIO_A, ...PORTFOLIO_A, ...PORTFOLIO_A].map((v, i) => {
              const localVideo = TILE_VIDEO_BY_ID[v.id];
              return (
                <button key={`top-${i}`} className="tile" onClick={() => setVideo(v)} aria-label={`Play ${v.t}`}>
                  <img src={poster(v.id, 400)} alt="" loading="lazy" />
                  {localVideo && <InViewVideo className="tile-video" src={localVideo} preload="metadata" desktopOnly />}
                  <span className="play">▶</span>
                  <span className="tl">{v.t}</span>
                </button>
              );
            })}
          </div>
          {/* Bottom row: scrolls right, different sequence */}
          <div className="mosaic-row bottom">
            {[...PORTFOLIO_B, ...PORTFOLIO_B, ...PORTFOLIO_B].map((v, i) => {
              const localVideo = TILE_VIDEO_BY_ID[v.id];
              return (
                <button key={`bot-${i}`} className="tile" onClick={() => setVideo(v)} aria-label={`Play ${v.t}`}>
                  <img src={poster(v.id, 400)} alt="" loading="lazy" />
                  {localVideo && <InViewVideo className="tile-video" src={localVideo} preload="metadata" desktopOnly />}
                  <span className="play">▶</span>
                  <span className="tl">{v.t}</span>
                </button>
              );
            })}
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
