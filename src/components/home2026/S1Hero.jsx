// S1 — THE HERO. Full-bleed black-and-white job-site photograph, dark scrim,
// type held inside a LEFT-HAND MEASURE so the right of the frame stays photograph,
// five-station strip pinned full-bleed across the bottom.
// Copy is frozen (./copy). Palette, type and spacing come from ./tokens only.
// Motion comes from ./motion only — two-beat headline, photo settle, station stagger.

import React from 'react';
import { S1_HERO } from './copy';
import { C, F, T, SP, LS, LH, MAXW, GUTTER, Eyebrow, Display, Body } from './tokens';
import { Reveal, Stagger, PhotoSettle, DUR } from './motion';

const HERO_IMG = '/home2026/hero.jpg';
const HERO_ALT =
  'Sheet metal worker in a hard hat lifting a spiral duct into place on an unfinished high-rise floor in Phoenix';

// ── Hand-placed line breaks ──────────────────────────────────────────────────
// The reference breaks the headline and the eyebrow at specific words. The browser is
// never allowed to choose. Every split re-emits the separator between the two spans, so
// the rendered text still reads exactly as the frozen string in copy.js.
function splitAfterWord(entry, n) {
  const parts = entry.split(' ');
  return [parts.slice(0, n).join(' '), parts.slice(n).join(' ')];
}

// '01 PHOTO' -> ['01', 'PHOTO'] so the station number can carry the bronze.
function splitStation(entry) {
  const i = entry.indexOf(' ');
  return i === -1 ? [entry, ''] : [entry.slice(0, i), entry.slice(i + 1)];
}

const [EB_1, EB_2] = splitAfterWord(S1_HERO.eyebrow, 3); // 'PHOENIX, ARIZONA , ' / rest
const [H1A_1, H1A_2] = splitAfterWord(S1_HERO.h1a, 2);         // 'YOUR WORK' / 'IS GOOD.'
const [H1B_1, H1B_2] = splitAfterWord(S1_HERO.h1b, 4);         // 'NOBODY OUTSIDE THE JOB' / 'SITE HAS SEEN IT.'

const CSS = `
/* The reference was rendered in a display face roughly a third narrower than Anton, so the
   headline is sized to match the reference's LINE LENGTH (the block stops at ~65% of the
   frame, clear of the worker) rather than its pixel height. Line-height stays on the token. */
.s1 {
  --s1-h1: clamp(48px, 6.8vw, 100px);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${C.ink};
  color: ${C.onInk};
  min-height: 100vh;
  min-height: 100svh;
}
.s1-media {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: ${C.ink};
}
.s1-photo {
  width: 100%;
  height: 100%;
}
.s1-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 72% 50%;
  filter: grayscale(1) contrast(1.06);
}
/* Weighted to the TYPE side. The left third is effectively solid so the headline sits on
   black; the right of the frame keeps its photograph instead of being dimmed evenly. */
.s1-scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, ${C.ink} 0%, ${C.ink} 34%, ${C.ink}E6 47%, ${C.ink}99 60%, ${C.ink}3D 78%, ${C.ink}14 100%),
    linear-gradient(180deg, ${C.ink}D9 0%, ${C.ink}00 22%, ${C.ink}00 54%, ${C.ink}F2 100%);
}
.s1-inner {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  width: 100%;
  padding: ${SP[10]}px ${GUTTER} ${SP[9]}px;
}
.s1-measure {
  width: 100%;
  max-width: ${MAXW}px;
  margin: 0 auto;
}
/* The left measure. This is defect (a): the headline may not run under the subject. */
.s1-copy {
  max-width: 70%;
}
.s1-eb1,
.s1-eb2 {
  display: inline;
}
.s1-a1,
.s1-a2 {
  display: inline;
}
.s1-b1,
.s1-b2 {
  display: block;
}
.s1-cta {
  font-family: ${F.mono};
  font-size: ${T.lbl};
  font-weight: 700;
  letter-spacing: ${LS.label};
  text-transform: uppercase;
  color: ${C.bronze};
  background: transparent;
  border: 1px solid ${C.bronze};
  padding: ${SP[4]}px ${SP[6]}px;
  margin-top: ${SP[6]}px;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
}
.s1-cta:hover {
  background: ${C.bronze};
  color: ${C.inkSoft};
}
.s1-cta:focus-visible {
  outline: 2px solid ${C.bronze};
  outline-offset: ${SP[1]}px;
}
/* Full-bleed in the reference — the bronze hairline and the dividers run edge to edge,
   five equal columns, content centred in each. */
.s1-strip {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  width: 100%;
  border-top: 1px solid ${C.bronzeDim};
  background: ${C.ink}B3;
}
.s1-strip-inner {
  width: 100%;
}
/* The Stagger wrapper is the grid; each of its children is one station cell. */
.s1-strip-inner > div {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  width: 100%;
}
.s1-strip-inner > div > div {
  min-width: 0;
  text-align: center;
  padding: ${SP[6]}px ${SP[3]}px;
  border-left: 1px solid ${C.bronzeDim};
}
.s1-strip-inner > div > div:first-child {
  border-left: none;
}
.s1-num {
  display: block;
  font-family: ${F.mono};
  font-size: ${T.d4};
  font-weight: 700;
  letter-spacing: ${LS.body};
  line-height: ${LH.head};
  color: ${C.bronze};
}
.s1-lbl {
  display: block;
  margin-top: ${SP[2]}px;
  font-family: ${F.mono};
  font-size: ${T.lbl};
  font-weight: 700;
  letter-spacing: ${LS.label};
  text-transform: uppercase;
  color: ${C.onInk};
}
.s1-lbl-hi {
  color: ${C.bronze};
}

@media (max-width: 768px) {
  /* Portrait is a different composition, not a squeeze: photograph on top, the whole type
     block beneath it on black, four hand-placed headline lines, bronze bar CTA. */
  .s1 {
    --s1-h1: clamp(30px, 9.8vw, 74px);
    min-height: 0;
  }
  .s1-media {
    position: relative;
    inset: auto;
    width: 100%;
    aspect-ratio: 5 / 4;
  }
  .s1-img {
    object-position: 50% 50%;
  }
  /* Was fading to solid black across the bottom 12% of the photo and then adding 40px of
     padding on top of that — defect (c), the dead band. The photo now holds almost to its
     own edge and the eyebrow sits straight underneath it. */
  .s1-scrim {
    background: linear-gradient(180deg, ${C.ink}D9 0%, ${C.ink}00 20%, ${C.ink}00 84%, ${C.ink} 100%);
  }
  .s1-inner {
    padding: ${SP[3]}px ${GUTTER} ${SP[6]}px;
  }
  .s1-copy {
    max-width: 100%;
  }
  .s1-eb1,
  .s1-eb2,
  .s1-a1,
  .s1-a2 {
    display: block;
  }
  .s1-cta {
    display: block;
    width: 100%;
    text-align: center;
    padding: ${SP[4]}px ${SP[5]}px;
    background: ${C.bronze};
    color: ${C.inkSoft};
    border-color: ${C.bronze};
  }
  .s1-cta:hover {
    background: ${C.bronzeDim};
  }
  .s1-strip-inner > div > div {
    padding: ${SP[4]}px ${SP[1]}px;
  }
}
`;

export default function S1Hero({ onOpenBrief }) {
  void onOpenBrief; // the hero button is not the contact button — see below

  // v2 (2026-08-11). The hero button reads SEE WHAT A MONTH LOOKS LIKE and used to open the
  // contact form, which is a bait: it asks for the reader's name before showing him anything.
  // It now scrolls to the month, which as of v2 actually shows a month. The contact button
  // lives in the nav and under the offer, where someone who has decided can find it.
  const openBrief = () => {
    const el = typeof document !== 'undefined' && document.getElementById('how-it-runs');
    if (!el) {
      if (typeof onOpenBrief === 'function') onOpenBrief();
      return;
    }
    el.scrollIntoView({
      behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <section className="s1" id="hero">
      <style>{CSS}</style>

      <div className="s1-media">
        <PhotoSettle style={{ width: '100%', height: '100%' }}>
          <img className="s1-img" src={HERO_IMG} alt={HERO_ALT} />
        </PhotoSettle>
        <div className="s1-scrim" aria-hidden="true" />
      </div>

      <div className="s1-inner">
        <div className="s1-measure">
          <div className="s1-copy">
            <Eyebrow style={{ fontWeight: 700, marginBottom: SP[5] }}>
              <span className="s1-eb1">{EB_1}</span>{' '}
              <span className="s1-eb2">{EB_2}</span>
            </Eyebrow>

            {/* THE ARGUMENT, IN TWO BEATS. The compliment lands, then it is held for ~450ms,
                then the problem arrives. The pause is the rhetorical turn. */}
            <Display
              as="h1"
              style={{
                color: C.onInk,
                fontSize: 'var(--s1-h1)',
                lineHeight: LH.display,
                marginBottom: SP[5],
              }}
            >
              <Reveal as="span" delay={120} y={22} duration={DUR.base} threshold={0.05} style={{ display: 'block' }}>
                <span className="s1-a1">{H1A_1}</span>{' '}
                <span className="s1-a2">{H1A_2}</span>
              </Reveal>
              <Reveal as="span" delay={570} y={22} duration={DUR.base} threshold={0.05} style={{ display: 'block' }}>
                <span className="s1-b1">{H1B_1}</span>{' '}
                <span className="s1-b2">{H1B_2}</span>
              </Reveal>
            </Display>

            <Body size={T.b1} style={{ color: C.onInk, maxWidth: '68ch' }}>
              {S1_HERO.body}
            </Body>

            <button type="button" className="s1-cta" onClick={openBrief}>
              {S1_HERO.cta}
            </button>
          </div>
        </div>
      </div>

      <div className="s1-strip">
        <div className="s1-strip-inner">
          {/* 01 through 05, left to right — the order of the month, taught before the
              section that explains it. */}
          <Stagger step={90} delay={260} y={12} duration={DUR.quick}>
            {S1_HERO.strip.map((entry, i) => {
              const [num, label] = splitStation(entry);
              const last = i === S1_HERO.strip.length - 1;
              return (
                <div key={entry}>
                  <span className="s1-num">{num}</span>{' '}
                  <span className={last ? 's1-lbl s1-lbl-hi' : 's1-lbl'}>{label}</span>
                </div>
              );
            })}
          </Stagger>
        </div>
      </div>
    </section>
  );
}