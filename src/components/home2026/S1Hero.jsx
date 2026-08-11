// S1 — THE HERO. Full-bleed black-and-white job-site photograph, dark scrim,
// type on the left, five-station strip pinned across the bottom.
// Copy is frozen (./copy). Palette, type and spacing come from ./tokens only.

import React from 'react';
import { S1_HERO } from './copy';
import { C, F, T, SP, LS, LH, MAXW, GUTTER, Eyebrow, Display, Body } from './tokens';

const HERO_IMG = '/home2026/hero.jpg';
const HERO_ALT =
  'Sheet metal worker in a hard hat lifting a spiral duct into place on an unfinished high-rise floor in Phoenix';

// '01 PHOTO' -> ['01', 'PHOTO'] so the station number can carry the bronze.
// The space is re-emitted between the two spans, so the rendered text still
// reads exactly as the frozen string.
function splitStation(entry) {
  const i = entry.indexOf(' ');
  return i === -1 ? [entry, ''] : [entry.slice(0, i), entry.slice(i + 1)];
}

const CSS = `
.s1 {
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
.s1-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 72% 50%;
  filter: grayscale(1) contrast(1.06);
}
.s1-scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, ${C.ink} 0%, ${C.ink}F2 32%, ${C.ink}A6 55%, ${C.ink}45 78%, ${C.ink}26 100%),
    linear-gradient(180deg, ${C.ink}CC 0%, ${C.ink}00 24%, ${C.ink}00 56%, ${C.ink}E6 100%);
}
.s1-inner {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  width: 100%;
  padding: ${SP[11]}px ${GUTTER} ${SP[10]}px;
}
.s1-measure {
  width: 100%;
  max-width: ${MAXW}px;
  margin: 0 auto;
}
.s1-l1,
.s1-l2 {
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
  margin-top: ${SP[7]}px;
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
.s1-strip {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  width: 100%;
  border-top: 1px solid ${C.bronzeDim};
  background: ${C.ink}B3;
}
.s1-strip-inner {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  width: 100%;
  max-width: ${MAXW}px;
  margin: 0 auto;
  padding: 0 ${GUTTER};
}
.s1-cell {
  padding: ${SP[5]}px ${SP[5]}px;
  border-left: 1px solid ${C.bronzeDim};
}
.s1-cell:first-child {
  border-left: none;
  padding-left: 0;
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
  .s1 {
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
  .s1-scrim {
    background: linear-gradient(180deg, ${C.ink}00 58%, ${C.ink}D9 88%, ${C.ink} 100%);
  }
  .s1-inner {
    padding: ${SP[7]}px ${GUTTER} ${SP[8]}px;
  }
  .s1-cta {
    display: block;
    width: 100%;
    text-align: center;
    padding: ${SP[4]}px ${SP[5]}px;
    background: ${C.bronze};
    color: ${C.inkSoft};
  }
  .s1-cta:hover {
    background: ${C.bronzeDim};
  }
  .s1-strip-inner {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    padding-right: ${GUTTER};
  }
  .s1-strip-inner::-webkit-scrollbar {
    display: none;
  }
  .s1-cell {
    flex: 0 0 auto;
    min-width: ${SP[11]}px;
    padding: ${SP[4]}px ${SP[4]}px ${SP[5]}px;
  }
}
`;

export default function S1Hero({ onOpenBrief }) {
  const openBrief = () => {
    if (typeof onOpenBrief === 'function') onOpenBrief();
  };

  return (
    <section className="s1" id="hero">
      <style>{CSS}</style>

      <div className="s1-media">
        <img className="s1-img" src={HERO_IMG} alt={HERO_ALT} />
        <div className="s1-scrim" aria-hidden="true" />
      </div>

      <div className="s1-inner">
        <div className="s1-measure">
          <Eyebrow style={{ fontWeight: 700, marginBottom: SP[5] }}>{S1_HERO.eyebrow}</Eyebrow>

          <Display
            as="h1"
            size={T.d1}
            style={{ color: C.onInk, lineHeight: LH.display, marginBottom: SP[6] }}
          >
            <span className="s1-l1">{S1_HERO.h1a}</span>{' '}
            <span className="s1-l2">{S1_HERO.h1b}</span>
          </Display>

          <Body size={T.b1} style={{ color: C.onInk, maxWidth: '44ch' }}>
            {S1_HERO.body}
          </Body>

          <button type="button" className="s1-cta" onClick={openBrief}>
            {S1_HERO.cta}
          </button>
        </div>
      </div>

      <div className="s1-strip">
        <div className="s1-strip-inner">
          {S1_HERO.strip.map((entry, i) => {
            const [num, label] = splitStation(entry);
            const last = i === S1_HERO.strip.length - 1;
            return (
              <div className="s1-cell" key={entry}>
                <span className="s1-num">{num}</span>{' '}
                <span className={last ? 's1-lbl s1-lbl-hi' : 's1-lbl'}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
