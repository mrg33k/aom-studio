// AOM home 2026 — S6 THE PROOF.
// Full-bleed split: black-and-white job-site photograph left, named client + checkable
// figures right. Mobile re-composes to photo-on-top (5:4, faded into the black), content
// stacked beneath, and the two figures become the graphic — set in the display face at
// headline scale, the way the portrait render solved it.
// Each figure prints exactly once: label above, number below.
//
// Geometry is measured off the approved renders, not eyeballed:
//   desktop — the headline FILLS the panel column (ref line 1 = 1105px in a 1107px column);
//   the bronze rule and the body share a narrower 84% measure; the figures sit in a block
//   narrower still; the CTA is content-sized, never stretched.
//   mobile  — the headline fills the full gutter-to-gutter column, no rule above the figures.
// Anton is wider than the render's display face, so the SIZES here are solved from Anton's
// real advance widths ("FOUR CALLS LAST MONTH." = 8.91em at -0.02em tracking) to reproduce
// the relationship — headline spans the measure, three hand-placed lines, never wrapping.

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
import { Reveal, CountUp } from './motion';

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
  padding: ${SP[11]}px clamp(20px, 3.6vw, 68px) ${SP[11]}px clamp(24px, 6.4vw, 120px);
  min-width: 0;
  /* Headline size fills the column at every width — line 1 is the longest and governs it.
     Carried as a custom property so the portrait breakpoint can restate it. */
  --s6-h2: clamp(30px, 4.35vw, 108px);
}
.s6-body { margin-top: ${SP[5]}px; max-width: 84%; }
.s6-rule { margin-top: ${SP[6]}px; max-width: 84%; }
.s6-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 86%;
  margin-top: ${SP[6]}px;
}
.s6-stat { padding-right: clamp(16px, 2.8vw, 40px); min-width: 0; }
.s6-stat + .s6-stat {
  border-left: 1px solid ${C.bronze};
  padding-left: clamp(16px, 2.8vw, 40px);
  padding-right: 0;
}
.s6-lbl {
  font-family: ${F.mono};
  font-size: clamp(9px, 0.8vw, 12px);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${C.bronze};
}
.s6-num {
  font-family: ${F.mono};
  font-size: ${T.d3};
  line-height: ${LH.head};
  letter-spacing: ${LS.display};
  color: ${C.onInk};
  margin-top: ${SP[4]}px;
}
.s6-ctawrap { margin-top: ${SP[7]}px; }
.s6-cta {
  display: inline-block;
  text-align: center;
  text-decoration: none;
  border: 1px solid ${C.bronze};
  color: ${C.bronze};
  background: transparent;
  font-family: ${F.mono};
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  text-transform: uppercase;
  padding: ${SP[5]}px ${SP[7]}px;
  transition: background 160ms ease, color 160ms ease;
}
.s6-cta:hover, .s6-cta:focus-visible {
  background: ${C.bronze};
  color: ${C.inkSoft};
}

/* Between 769 and 1080 the panel column is too narrow to hold the figures inside 86%
   without the mono labels wrapping — the block takes the full measure instead. */
@media (max-width: 1080px) {
  .s6-stats { max-width: 100%; }
  .s6-stat { padding-right: ${SP[4]}px; }
  .s6-stat + .s6-stat { padding-left: ${SP[4]}px; }
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
    height: 42%;
    background: linear-gradient(to bottom, transparent 0%, ${C.ink} 100%);
  }
  .s6-panel {
    padding: ${SP[5]}px ${GUTTER} ${SP[8]}px;
    --s6-h2: clamp(26px, 9.5vw, 78px);
  }
  .s6-body { margin-top: ${SP[4]}px; max-width: 100%; }
  .s6-rule { display: none; }
  .s6-stats { max-width: 100%; margin-top: ${SP[5]}px; }
  .s6-stat { padding-right: ${SP[3]}px; }
  .s6-stat + .s6-stat { padding-left: ${SP[3]}px; }
  .s6-lbl { font-size: clamp(9px, 2.5vw, 12px); }
  /* Portrait render sets the figures in the display face at headline scale. */
  .s6-num {
    font-family: ${F.display};
    font-size: clamp(30px, 9.8vw, 76px);
    margin-top: ${SP[2]}px;
  }
  .s6-ctawrap { margin-top: ${SP[4]}px; }
  .s6-cta { padding: ${SP[4]}px ${SP[5]}px; }
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
          <Reveal>
            <Eyebrow style={{ marginBottom: 0 }}>{S6_PROOF.eyebrow}</Eyebrow>
          </Reveal>

          {/* Three hand-placed lines. The browser never picks these breaks. */}
          <Reveal delay={60} style={{ marginTop: SP[6] }}>
            <Display as="h2" size="var(--s6-h2)" style={{ color: C.onInk }}>
              <span style={{ display: 'block' }}>{S6_PROOF.h2a}</span>
              <span style={{ display: 'block' }}>{S6_PROOF.h2b}</span>
              <span style={{ display: 'block' }}>{S6_PROOF.h2c}</span>
            </Display>
          </Reveal>

          <Reveal delay={120} className="s6-body">
            <Body size={T.b1} style={{ color: C.onInk, opacity: 0.86 }}>
              {S6_PROOF.body}
            </Body>
          </Reveal>

          <Reveal delay={160} className="s6-rule">
            <Rule style={{ background: C.bronze }} />
          </Reveal>

          <Reveal delay={200} className="s6-stats">
            {S6_PROOF.stats.map(stat => (
              <div className="s6-stat" key={stat.label}>
                <div className="s6-lbl">{stat.label}</div>
                {/* The one place a number is allowed to move: a figure that counts is a
                    figure somebody tallied. Never on a price or a ledger row. */}
                <div className="s6-num">
                  <CountUp value={stat.value} />
                </div>
              </div>
            ))}
          </Reveal>

          <Reveal delay={260} className="s6-ctawrap">
            <a className="s6-cta" href="/work/ambition-mechanical">
              {S6_PROOF.cta}
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
