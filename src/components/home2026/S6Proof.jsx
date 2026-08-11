// AOM home 2026 — S6 THE PROOF.
// Full-bleed split: black-and-white job-site photograph left, named client + checkable
// figures right. Mobile re-composes to photo-on-top, content stacked beneath.
// Each figure prints exactly once: label above, number below.

import React from 'react';
import {
  C,
  F,
  SP,
  T,
  LS,
  LH,
  GUTTER,
  Eyebrow,
  Display,
  Body,
  Rule,
} from './tokens';
import { S6_PROOF } from './copy';

const CSS = `
.s6-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
  background: ${C.ink};
  color: ${C.onInk};
  width: 100%;
}
.s6-photo {
  position: relative;
  overflow: hidden;
  background: ${C.inkSoft};
}
.s6-photo img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: grayscale(1);
}
.s6-fade { display: none; }
.s6-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: ${SP[11]}px ${SP[10]}px;
  min-width: 0;
}
.s6-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.s6-stat { padding-right: ${SP[6]}px; }
.s6-stat + .s6-stat {
  border-left: 1px solid ${C.bronze};
  padding-left: ${SP[8]}px;
  padding-right: 0;
}
.s6-cta {
  align-self: flex-start;
  display: inline-block;
  text-align: center;
  text-decoration: none;
  border: 1px solid ${C.bronze};
  color: ${C.bronze};
  background: transparent;
  padding: ${SP[5]}px ${SP[7]}px;
  transition: background 160ms ease, color 160ms ease;
}
.s6-cta:hover, .s6-cta:focus-visible {
  background: ${C.bronze};
  color: ${C.inkSoft};
}

@media (max-width: 768px) {
  .s6-wrap { grid-template-columns: 1fr; }
  .s6-photo { aspect-ratio: 5 / 4; }
  .s6-fade {
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 38%;
    background: linear-gradient(to bottom, transparent 0%, ${C.ink} 100%);
  }
  .s6-panel { padding: ${SP[8]}px ${GUTTER} ${SP[10]}px; }
  .s6-rule { display: none; }
  .s6-stat { padding-right: ${SP[4]}px; }
  .s6-stat + .s6-stat { padding-left: ${SP[6]}px; }
  .s6-cta {
    align-self: stretch;
    padding: ${SP[5]}px ${SP[4]}px;
  }
}
`;

export default function S6Proof({ onOpenBrief }) {
  return (
    <section id="proof" style={{ background: C.ink, color: C.onInk }}>
      <style>{CSS}</style>

      <div className="s6-wrap">
        <div className="s6-photo">
          <img src="/home2026/proof.jpg" alt={S6_PROOF.eyebrow} />
          <div className="s6-fade" aria-hidden="true" />
        </div>

        <div className="s6-panel">
          <Eyebrow style={{ marginBottom: SP[5] }}>{S6_PROOF.eyebrow}</Eyebrow>

          <Display as="h2" size={T.d2} style={{ color: C.onInk, lineHeight: LH.display }}>
            <span style={{ display: 'block' }}>{S6_PROOF.h2a}</span>
            <span style={{ display: 'block' }}>{S6_PROOF.h2b}</span>
            <span style={{ display: 'block' }}>{S6_PROOF.h2c}</span>
          </Display>

          <Body
            size={T.b1}
            style={{ color: C.onInk, opacity: 0.86, marginTop: SP[6], maxWidth: '52ch' }}
          >
            {S6_PROOF.body}
          </Body>

          <div className="s6-rule" style={{ marginTop: SP[6] }}>
            <Rule style={{ background: C.bronze }} />
          </div>

          <div className="s6-stats" style={{ marginTop: SP[6] }}>
            {S6_PROOF.stats.map(stat => (
              <div className="s6-stat" key={stat.label}>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: T.lbl,
                    letterSpacing: LS.label,
                    textTransform: 'uppercase',
                    color: C.bronze,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: T.d3,
                    lineHeight: LH.head,
                    letterSpacing: LS.display,
                    color: C.onInk,
                    marginTop: SP[3],
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <a
            className="s6-cta"
            href="/work/ambition-mechanical"
            style={{
              fontFamily: F.mono,
              fontSize: T.lbl,
              letterSpacing: LS.label,
              textTransform: 'uppercase',
              marginTop: SP[8],
            }}
          >
            {S6_PROOF.cta}
          </a>
        </div>
      </div>
    </section>
  );
}
