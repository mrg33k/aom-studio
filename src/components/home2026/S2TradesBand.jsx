// S2 — the trades band. SHORT, reversed on black, pure type, no photography, no CTA.
// Copy: S2_TRADES (frozen). Tokens: tokens.jsx. Motion: motion.jsx. Nothing local is invented.
//
// The two approved renders are the SAME section at two measures, not two ideas:
//   bands-2026-08-10/band-trades.png       — wide: one bronze-ruled row, trades read across in a
//                                            single line, the two lines set small to the right.
//   mobile-remaining-2026-08-10/m5-band-trades.png (and scroll-2026-08-10/who-this-is-for-dark.png)
//                                          — narrow: the trades stack into a left-aligned slab,
//                                            a bronze rule under it, the two lines beneath.
// So the row composition engages only where a single line of six trades can actually hold its
// size; everything narrower gets the portrait solve, which is what phones and tablets show.

import React from 'react';
import { S2_TRADES } from './copy';
import { C, F, T, LS, LH, SP, GUTTER, Section, Display, Body, Rule } from './tokens';
import { WipeIn, Reveal, DUR } from './motion';

// The headline is ONE frozen string. It is split on its own sentence breaks purely so each
// trade can carry the bronze marker and never break mid-word; re-joined it is byte-identical.
const TRADES = S2_TRADES.h2.split('. ').map((part, i, all) => (i === all.length - 1 ? part : `${part}.`));

// min(2.15vw, 32px) is the largest size that keeps all six trades on ONE line inside the
// remaining measure at every width from 1181px up, with ~5% slack. No step on the shared T scale
// does it: d3 overflows by 200px at 1440, d4 reads as a caption. The render's display face is
// ~1.45x narrower than Anton, so this is the size that buys the reference's COMPOSITION — one
// line, band height ~199px at 1440. Below 1181 the portrait solve takes over on T.d2.
const CSS = `
#trades {
  --s2tb-pad: ${SP[8]}px;
  --s2tb-display: ${T.d2};
  --s2tb-body: ${T.b1};
}
#trades .s2tb-lines { margin-top: ${SP[5]}px; }
#trades .s2tb-rule { display: block; margin-top: ${SP[5]}px; }
@media (min-width: 1181px) {
  #trades {
    --s2tb-pad: ${SP[9]}px;
    --s2tb-display: min(2.15vw, 32px);
    --s2tb-body: ${T.b2};
  }
  #trades .s2tb-row { display: flex; align-items: center; gap: ${SP[7]}px; }
  #trades .s2tb-trades { flex: 1 1 auto; min-width: 0; }
  #trades .s2tb-lines { flex: 0 0 auto; margin-top: 0; white-space: nowrap; }
  #trades .s2tb-rule { display: none; }
}
`;

const markStyle = {
  display: 'inline-block',
  width: '0.115em',
  height: '0.115em',
  marginLeft: '0.07em',
  background: C.bronze,
  verticalAlign: 'baseline',
};

export default function S2TradesBand() {
  return (
    <Section
      tone="ink"
      short
      id="trades"
      style={{
        // The band is bounded, not floating. Without these bronze hairlines this section and the
        // hero above it merge into one unbroken stretch of black — the defect the client caught.
        borderTop: `1px solid ${C.bronze}`,
        borderBottom: `1px solid ${C.bronze}`,
        padding: `var(--s2tb-pad) ${GUTTER}`,
      }}
    >
      <style>{CSS}</style>

      <div className="s2tb-row">
        <div className="s2tb-trades">
          {/* THE move: the trade list is uncovered left to right, once, like a sign being read. */}
          <WipeIn duration={DUR.slow} style={{ paddingTop: SP[1], paddingBottom: SP[1] }}>
            <Display
              as="h2"
              size="var(--s2tb-display)"
              style={{
                fontFamily: F.display,
                color: C.onInk,
                lineHeight: LH.display,
                letterSpacing: LS.display,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                columnGap: '0.14em',
                rowGap: 0,
              }}
            >
              {TRADES.map(word => (
                <span key={word} style={{ whiteSpace: 'nowrap' }}>
                  {word}
                  <i style={markStyle} aria-hidden="true" />
                </span>
              ))}
            </Display>
          </WipeIn>

          {/* Portrait solve only — on the wide band the section's own bronze edges carry the accent. */}
          <div className="s2tb-rule">
            <Rule tone="ink" style={{ background: C.bronze }} />
          </div>
        </div>

        <div className="s2tb-lines">
          <Reveal delay={620} duration={DUR.quick} y={12}>
            <Body size="var(--s2tb-body)" tone="ink">{S2_TRADES.body1}</Body>
          </Reveal>
          {/* LATE and alone. The 500ms beat is the joke; these two must never arrive together. */}
          <Reveal delay={1120} duration={DUR.quick} y={12} style={{ marginTop: SP[2] }}>
            <Body size="var(--s2tb-body)" tone="ink">{S2_TRADES.body2}</Body>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
