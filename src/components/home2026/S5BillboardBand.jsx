// S5 — the billboard band. A breather between the two heaviest sections.
// One display line, one bronze sub, nothing else. Short, centred, and BONE:
// the approved in-page-context render puts a light band between the ink offer
// above and the ink proof below. Ink here welds three sections into one long
// dark stretch, which is the defect the client already caught.
// Centred type is correct HERE and only here on this page.

import React from 'react';
import { C, T, LS, LH, SP, Section, Display, Eyebrow } from './tokens';
import { S5_BILLBOARD } from './copy';
import { Reveal, DUR } from './motion';

// The headline is ONE frozen string. We never retype it — we split it on its own
// sentence boundary so the mobile break lands where the approved render puts it
// (after "TOLD."). The two spans are inline on desktop with a real space between
// them, so the rendered text content is byte-identical to S5_BILLBOARD.h2 at
// every width.
const HEAD = S5_BILLBOARD.h2;
const SPLIT = HEAD.indexOf('. ');
const LINE_A = SPLIT > -1 ? HEAD.slice(0, SPLIT + 1) : HEAD;
const LINE_B = SPLIT > -1 ? HEAD.slice(SPLIT + 2) : '';

// Size is measured off the reference, not guessed. In the approved desktop render
// the single headline line spans 84.6% of the frame — it is a BILLBOARD, it fills
// its measure. Anton is wider per cap-height than the render's face, so matching
// the pixel height would overflow; we match the WIDTH relationship instead:
// 3.9vw capped at 56px puts the 52-character line at 83.5% of a 1440 viewport.
// Below 768px the composition changes (two hand-placed lines, longest is 31
// characters) so it gets its own ramp — a squeezed desktop size overflows a
// 390px phone by ~9px at the d3 floor.
const CSS = `
#billboard {
  --s5b-pt: ${SP[10]}px;
  --s5b-pb: ${SP[9]}px;
  --s5b-head: clamp(30px, 3.9vw, 56px);
  --s5b-gap: ${SP[6]}px;
}
#billboard .s5b-line { display: inline; }
@media (max-width: 768px) {
  #billboard {
    --s5b-pt: ${SP[8]}px;
    --s5b-pb: ${SP[8]}px;
    --s5b-head: clamp(20px, 6.4vw, 50px);
    --s5b-gap: ${SP[3]}px;
  }
  #billboard .s5b-line { display: block; }
}
`;

// eslint-disable-next-line no-unused-vars
export default function S5BillboardBand({ onOpenBrief }) {
  return (
    <Section
      id="billboard"
      tone="bone"
      short
      style={{
        borderTop: `3px solid ${C.bronze}`,
        borderBottom: `3px solid ${C.bronze}`,
        paddingTop: 'var(--s5b-pt)',
        paddingBottom: 'var(--s5b-pb)',
        textAlign: 'center',
      }}
    >
      <style>{CSS}</style>

      {/* The one move: a single slow fade of the whole line, no travel, no wipe,
          no stagger. A rest that performs is not a rest. */}
      <Reveal y={0} duration={DUR.slow} threshold={0.35}>
        <Display
          as="h2"
          size="var(--s5b-head)"
          style={{
            color: C.onBone,
            lineHeight: LH.display,
            letterSpacing: LS.display,
            textWrap: 'balance',
            margin: 0,
          }}
        >
          {LINE_B ? (
            <React.Fragment>
              <span className="s5b-line">{LINE_A}</span>
              {' '}
              <span className="s5b-line">{LINE_B}</span>
            </React.Fragment>
          ) : (
            HEAD
          )}
        </Display>

        <Eyebrow style={{ fontSize: T.b2, marginTop: 'var(--s5b-gap)', marginBottom: 0 }}>
          {S5_BILLBOARD.sub}
        </Eyebrow>
      </Reveal>
    </Section>
  );
}
