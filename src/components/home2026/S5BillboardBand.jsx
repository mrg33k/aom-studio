// S5 — the billboard band. A breather between the two heaviest sections.
// One display line, one bronze sub, nothing else. Ink, short, centred.
// Centred type is correct HERE and only here on this page.

import React from 'react';
import { C, T, LS, LH, SP, Section, Display, Eyebrow } from './tokens';
import { S5_BILLBOARD } from './copy';

// The headline is ONE frozen string. We never retype it — we split it on its own
// sentence boundary so the mobile break lands where the approved render puts it.
// The two spans are inline on desktop with a real space between them, so the
// rendered text content is byte-identical to S5_BILLBOARD.h2 at every width.
const HEAD = S5_BILLBOARD.h2;
const SPLIT = HEAD.indexOf('. ');
const LINE_A = SPLIT > -1 ? HEAD.slice(0, SPLIT + 1) : HEAD;
const LINE_B = SPLIT > -1 ? HEAD.slice(SPLIT + 2) : '';

const CSS = `
.s5-band-line { display: inline; }
@media (max-width: 768px) {
  .s5-band-line { display: block; }
}
`;

export default function S5BillboardBand({ onOpenBrief }) {
  return (
    <Section
      id="billboard"
      tone="ink"
      short
      style={{
        borderTop: `1px solid ${C.bronze}`,
        borderBottom: `1px solid ${C.bronze}`,
        textAlign: 'center',
      }}
    >
      <style>{CSS}</style>

      <Display
        as="h2"
        size={T.d3}
        style={{
          color: C.onInk,
          lineHeight: LH.display,
          letterSpacing: LS.display,
          textWrap: 'balance',
          margin: 0,
        }}
      >
        {LINE_B ? (
          <React.Fragment>
            <span className="s5-band-line">{LINE_A}</span>
            {' '}
            <span className="s5-band-line">{LINE_B}</span>
          </React.Fragment>
        ) : (
          HEAD
        )}
      </Display>

      <Eyebrow style={{ fontSize: T.b2, marginTop: SP[6], marginBottom: 0 }}>
        {S5_BILLBOARD.sub}
      </Eyebrow>
    </Section>
  );
}
