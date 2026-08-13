// S7 — THE LEDGER. Bone paper, ruled three-column table, black totals band.
// Every colour, face, size and space comes from ./tokens. Every string comes from ./copy.
import React from 'react';
import { C, F, T, SP, LS, LH, GUTTER, Section, Eyebrow, Display } from './tokens';
import { S7_MATH } from './copy';
import { Reveal, Stagger, DUR } from './motion';

// Figure tracking. A ledger needs air between digits; this is the one local metric value and it
// is used twice — once to set the tracking, once to cancel the trailing space it leaves after the
// last glyph. CSS letter-spacing is applied AFTER the final character, so right-aligned mono sits
// one track-width left of where a right-aligned label sits. That is the column drift in the live
// build: the figures and their bronze headers did not share a right edge. Cancelling the trailing
// track on every right-aligned cell puts headers, rows and totals on ONE edge at every width.
const FIG_TRACK = '0.08em';

// FITTED DISPLAY SIZES (same problem, and the same remedy, as S8's headline).
// The reference sets both the headline and the punchline as ONE full-measure band. Anton is
// materially wider than the condensed face the render used — T.d2 wraps the headline and leaves
// "OF US." orphaned, which is exactly what the live build shows. These are fitted values that
// keep the reference's single band; they are section-local, not new steps on the shared scale.
// Mobile is not the same line, so it gets its own fitted value against the phone measure.
const H2_DESKTOP = 'clamp(32px, 4.45vw, 64px)';
const H2_MOBILE = 'clamp(32px, 11vw, 46px)';
const PUNCH_DESKTOP = 'clamp(25px, 3.25vw, 48px)';
const PUNCH_MOBILE = 'clamp(28px, 10vw, 40px)';

// Hand-placed line breaks. Indices are WORD counts against the frozen copy string — no visible
// character is ever typed here, and the segments always re-concatenate to the copy.js string.
function seg(text, from, to) {
  return text.split(' ').slice(from, to).join(' ');
}

// Scoped stylesheet. Prefix .s7- . Everything below is token-interpolated — no loose values.
// Desktop: 3 columns, continuous bronze vertical rules, all figures right-aligned to one edge.
// Mobile (<=768px): every row re-composes into a two-line stack — label over its two figures,
// which stay together on one line so a number can never orphan from its label.
const S7_CSS = `
.s7-h2wrap { --s7-h2: ${H2_DESKTOP}; }
.s7-punch { --s7-punch: ${PUNCH_DESKTOP}; margin-top: ${SP[4]}px; }
.s7-brm { display: none; }

.s7-table { margin-top: ${SP[7]}px; }

/* The row carries NO vertical padding — the cells do. A grid item only stretches across the
   container's CONTENT box, so padding on the row would leave a gap above and below every
   border-left and the bronze verticals would render as a ladder of ticks instead of the
   reference's two continuous rules. Padding on the cell makes the rule span the whole row. */
/* v2: a FOURTH column, WHO DOES IT HERE. The left column names five people you would have to
   hire, which provokes "so who is my marketing manager?" — and v1 never answered it. Reading
   US seven times straight down the right edge assembles the department the table already made
   the reader imagine. The repetition IS the argument, so it is set as a stamp, not a sentence. */
.s7-row {
  display: grid;
  grid-template-columns: 1fr 17% 17% 16%;
  align-items: stretch;
  border-bottom: 1px solid ${C.bronze};
}
.s7-cell {
  font-family: ${F.mono};
  font-size: ${T.b2};
  line-height: ${LH.body};
  letter-spacing: ${FIG_TRACK};
  color: ${C.onBone};
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  padding-top: ${SP[2]}px;
  padding-bottom: ${SP[2]}px;
}
.s7-c1 { padding-left: ${SP[2]}px; }
.s7-c2, .s7-c3 {
  text-align: right;
  border-left: 1px solid ${C.bronze};
  padding-right: ${SP[6]}px;
  margin-right: calc(-1 * ${FIG_TRACK});
}

/* The stamp column. Left-aligned so the repeated word forms a clean vertical edge the eye
   runs down; right-aligning it would ragged-edge on "OURS, BOUGHT". */
.s7-c4 {
  border-left: 1px solid ${C.bronze};
  padding-left: ${SP[5]}px;
  padding-right: ${SP[2]}px;
  color: ${C.bronzeDim};
  font-weight: 700;
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  text-transform: uppercase;
  display: flex;
  align-items: center;
}

.s7-hdr .s7-cell {
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  text-transform: uppercase;
  padding-top: 0;
  padding-bottom: ${SP[4]}px;
}
.s7-hdr .s7-c2, .s7-hdr .s7-c3 {
  border-left: none;
  color: ${C.bronzeDim};
  margin-right: calc(-1 * ${LS.label});
}
.s7-hdr .s7-c4 { border-left: none; align-items: flex-start; }

/* The totals rows carry no stamp, so the fourth column's rule would box an empty cell. */
.s7-tot .s7-c4 { border-left: none; }
.s7-lastrow { border-bottom: none; }
.s7-thick { height: 2px; background: ${C.onBone}; }

.s7-tot { border-bottom: none; }
.s7-tot .s7-cell {
  font-family: ${F.display};
  font-weight: 400;
  font-size: ${T.d3};
  line-height: ${LH.head};
  letter-spacing: ${LS.display};
  text-transform: uppercase;
  padding-top: ${SP[4]}px;
  padding-bottom: ${SP[4]}px;
}
.s7-tot .s7-c2, .s7-tot .s7-c3 { margin-right: calc(-1 * ${LS.display}); }

.s7-ours { background: ${C.ink}; border-bottom: none; }
.s7-ours .s7-cell {
  font-family: ${F.display};
  font-weight: 400;
  font-size: ${T.d3};
  line-height: ${LH.head};
  letter-spacing: ${LS.display};
  text-transform: uppercase;
  color: ${C.onInk};
  border-left: none;
  padding-top: ${SP[5]}px;
  padding-bottom: ${SP[5]}px;
}
.s7-ours .s7-c2, .s7-ours .s7-c3 {
  color: ${C.bronze};
  margin-right: calc(-1 * ${LS.display});
}

.s7-footrule { height: 1px; background: ${C.bronze}; margin-top: ${SP[5]}px; }
.s7-foot {
  margin: ${SP[4]}px 0 0 0;
  font-family: ${F.mono};
  font-size: ${T.lbl};
  line-height: ${LH.body};
  letter-spacing: ${LS.label};
  text-transform: uppercase;
  color: ${C.onBone};
  text-align: center;
}

@media (max-width: 768px) {
  .s7-h2wrap { --s7-h2: ${H2_MOBILE}; }
  .s7-punch { --s7-punch: ${PUNCH_MOBILE}; }
  .s7-brm { display: inline; }

  .s7-table { margin-top: ${SP[6]}px; }
  /* No vertical rules on the phone, so the padding goes back on the row — otherwise the
     two-line stack would be padded twice, once per grid row. */
  /* Three columns on the phone: the two figures stay together on one line and the stamp
     rides the right edge of that same line, so no cell ever orphans from its label. */
  .s7-row {
    grid-template-columns: 1fr 1fr 0.85fr;
    /* Without a column gap the totals row renders "$12,408$148,900" — the two
       display-size figures kiss at exactly the phone viewport. */
    column-gap: ${SP[3]}px;
    row-gap: ${SP[1]}px;
    padding-top: ${SP[3]}px;
    padding-bottom: ${SP[2]}px;
  }
  .s7-cell,
  .s7-hdr .s7-cell,
  .s7-tot .s7-cell,
  .s7-ours .s7-cell { padding-top: 0; padding-bottom: 0; }
  .s7-tot { padding-top: ${SP[4]}px; padding-bottom: ${SP[4]}px; }
  .s7-c1 {
    grid-column: 1 / -1;
    padding-left: 0;
    font-size: ${T.lbl};
    font-weight: 700;
    letter-spacing: ${LS.label};
  }
  .s7-c2, .s7-c3 {
    text-align: left;
    border-left: none;
    padding-right: 0;
    margin-right: 0;
    font-size: ${T.d4};
    line-height: ${LH.head};
    letter-spacing: ${LS.body};
  }
  .s7-c4 {
    border-left: none;
    padding-left: 0;
    padding-right: 0;
    justify-content: flex-end;
    text-align: right;
  }
  .s7-hdr { border-bottom: none; padding-bottom: ${SP[3]}px; }
  .s7-hdr .s7-c2, .s7-hdr .s7-c3 { font-size: ${T.lbl}; letter-spacing: ${LS.label}; margin-right: 0; }
  /* The header's fourth label is long; on the phone the stamps read on their own. */
  .s7-hdr .s7-c4 { display: none; }
  .s7-tot .s7-c4, .s7-ours .s7-c4 { display: none; }
  .s7-thick { background: ${C.bronze}; }
  .s7-tot .s7-c2, .s7-tot .s7-c3 {
    font-family: ${F.mono};
    font-size: ${T.d3};
    letter-spacing: ${LS.body};
    margin-right: 0;
  }
  /* The reference bleeds the black band to both phone edges. */
  .s7-ours {
    margin-left: calc(0px - ${GUTTER});
    margin-right: calc(0px - ${GUTTER});
    padding-left: ${GUTTER};
    padding-right: ${GUTTER};
    padding-top: ${SP[5]}px;
    padding-bottom: ${SP[5]}px;
  }
  .s7-ours .s7-c2, .s7-ours .s7-c3 { font-size: ${T.d2}; margin-right: 0; }
  .s7-foot { text-align: left; }
}
`;

export default function S7Math({ onOpenBrief }) {
  void onOpenBrief; // this section carries no call to action — the ledger is the argument.

  const [headItem, headMonth, headYear, headWho] = S7_MATH.head;
  const [theirsLabel, theirsMonth, theirsYear] = S7_MATH.totalTheirs;
  const [oursLabel, oursMonth, oursYear] = S7_MATH.totalOurs;
  const lastIndex = S7_MATH.rows.length - 1;

  // Headline: ONE line on desktop (the reference's band), three hand-placed lines on the phone.
  const h2a = seg(S7_MATH.h2, 0, 3);
  const h2b = seg(S7_MATH.h2, 3, 6);
  const h2c = seg(S7_MATH.h2, 6);

  // Punchline: ONE line on desktop, three hand-placed lines on the phone.
  const pa = seg(S7_MATH.punchline, 0, 4);
  const pb = seg(S7_MATH.punchline, 4, 7);
  const pc = seg(S7_MATH.punchline, 7);

  return (
    <Section tone="bone" id="math">
      <style>{S7_CSS}</style>

      <Eyebrow tone="bone">{S7_MATH.eyebrow}</Eyebrow>
      <div className="s7-h2wrap">
        <Display as="h2" size="var(--s7-h2)" style={{ color: C.onBone }}>
          {h2a}<br className="s7-brm" />{' '}{h2b}<br className="s7-brm" />{' '}{h2c}
        </Display>
      </div>

      <div className="s7-table">
        {/* The ledger builds top to bottom so the reader adds it up as it arrives.
            The FIGURES never count or animate — rows move, numbers do not. */}
        <Stagger step={60} y={14} duration={DUR.quick}>
          <div className="s7-row s7-hdr">
            <div className="s7-cell s7-c1">{headItem}</div>
            <div className="s7-cell s7-c2">{headMonth}</div>
            <div className="s7-cell s7-c3">{headYear}</div>
            <div className="s7-cell s7-c4">{headWho}</div>
          </div>

          {S7_MATH.rows.map(([item, month, year, who], i) => (
            <div className={i === lastIndex ? 's7-row s7-lastrow' : 's7-row'} key={item}>
              <div className="s7-cell s7-c1">{item}</div>
              <div className="s7-cell s7-c2">{month}</div>
              <div className="s7-cell s7-c3">{year}</div>
              <div className="s7-cell s7-c4">{who}</div>
            </div>
          ))}
        </Stagger>

        <Reveal delay={120} y={14} duration={DUR.quick}>
          <div className="s7-thick" />
          <div className="s7-row s7-tot">
            <div className="s7-cell s7-c1">{theirsLabel}</div>
            <div className="s7-cell s7-c2">{theirsMonth}</div>
            <div className="s7-cell s7-c3">{theirsYear}</div>
            <div className="s7-cell s7-c4" aria-hidden="true" />
          </div>
        </Reveal>

        <Reveal delay={240} y={14} duration={DUR.quick}>
          <div className="s7-row s7-ours">
            <div className="s7-cell s7-c1">{oursLabel}</div>
            <div className="s7-cell s7-c2">{oursMonth}</div>
            <div className="s7-cell s7-c3">{oursYear}</div>
            <div className="s7-cell s7-c4" aria-hidden="true" />
          </div>
        </Reveal>
      </div>

      <Reveal className="s7-punch" delay={420}>
        <Display as="p" size="var(--s7-punch)" style={{ color: C.onBone }}>
          {pa}<br className="s7-brm" />{' '}{pb}<br className="s7-brm" />{' '}{pc}
        </Display>
      </Reveal>

      <div className="s7-footrule" />
      <p className="s7-foot">{S7_MATH.footnote}</p>
    </Section>
  );
}
