// S7 — THE LEDGER. Bone paper, ruled three-column table, bronze totals band.
// Every colour, face, size and space comes from ./tokens. Every string comes from ./copy.
import React from 'react';
import { C, F, T, SP, LS, LH, GUTTER, Section, Eyebrow, Display } from './tokens';
import { S7_MATH } from './copy';

// Scoped stylesheet. Prefix .s7- . Everything below is token-interpolated — no loose values.
// Desktop: 3 columns, bronze vertical rules, figures right-aligned.
// Mobile (<=768px): every row re-composes into a two-line stack — label over its two figures,
// which stay together on one line so a number can never orphan from its label.
const S7_CSS = `
.s7-table { margin-top: ${SP[7]}px; }

.s7-row {
  display: grid;
  grid-template-columns: 1fr 23% 20.5%;
  align-items: baseline;
  padding-top: ${SP[2]}px;
  padding-bottom: ${SP[2]}px;
  border-bottom: 1px solid ${C.bronze};
}
.s7-cell {
  font-family: ${F.mono};
  font-size: ${T.b2};
  line-height: ${LH.body};
  letter-spacing: 0.08em;
  color: ${C.onBone};
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}
.s7-c1 { padding-left: ${SP[3]}px; }
.s7-c2, .s7-c3 { text-align: right; border-left: 1px solid ${C.bronze}; }
.s7-c2 { padding-right: min(38%, ${SP[10]}px); }
.s7-c3 { padding-right: min(19%, ${SP[8]}px); }

.s7-hdr { padding-top: 0; padding-bottom: ${SP[4]}px; }
.s7-hdr .s7-cell {
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  text-transform: uppercase;
}
.s7-hdr .s7-c2, .s7-hdr .s7-c3 { border-left: none; color: ${C.bronze}; }

.s7-lastrow { border-bottom: none; }
.s7-thick { height: 2px; background: ${C.bronze}; }

.s7-tot {
  border-bottom: none;
  padding-top: ${SP[4]}px;
  padding-bottom: ${SP[4]}px;
}
.s7-tot .s7-cell {
  font-family: ${F.display};
  font-weight: 400;
  font-size: ${T.d3};
  line-height: ${LH.head};
  letter-spacing: ${LS.display};
  text-transform: uppercase;
}

.s7-ours {
  background: ${C.ink};
  border-bottom: none;
  padding-top: ${SP[5]}px;
  padding-bottom: ${SP[5]}px;
}
.s7-ours .s7-cell {
  font-family: ${F.display};
  font-weight: 400;
  font-size: ${T.d3};
  line-height: ${LH.head};
  letter-spacing: ${LS.display};
  text-transform: uppercase;
  color: ${C.onInk};
  border-left: none;
}
.s7-ours .s7-c2, .s7-ours .s7-c3 { color: ${C.bronze}; }

.s7-footrule { height: 2px; background: ${C.bronze}; margin-top: ${SP[4]}px; }
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
  .s7-table { margin-top: ${SP[6]}px; }
  .s7-row {
    grid-template-columns: 1.3fr 1fr;
    row-gap: ${SP[1]}px;
    padding-top: ${SP[3]}px;
    padding-bottom: ${SP[2]}px;
  }
  .s7-c1 { grid-column: 1 / -1; padding-left: 0; }
  .s7-c2, .s7-c3 {
    text-align: left;
    border-left: none;
    padding-right: 0;
    font-size: ${T.d4};
  }
  .s7-hdr { border-bottom: none; padding-bottom: ${SP[3]}px; }
  .s7-hdr .s7-c2, .s7-hdr .s7-c3 { font-size: ${T.lbl}; }
  .s7-tot .s7-c2, .s7-tot .s7-c3 {
    font-family: ${F.mono};
    font-size: ${T.d3};
    letter-spacing: ${LS.body};
  }
  .s7-ours {
    margin-left: calc(-1 * ${GUTTER});
    margin-right: calc(-1 * ${GUTTER});
    padding-left: ${GUTTER};
    padding-right: ${GUTTER};
  }
  .s7-ours .s7-c2, .s7-ours .s7-c3 { font-size: ${T.d3}; }
  .s7-foot { text-align: left; }
}
`;

export default function S7Math({ onOpenBrief }) {
  void onOpenBrief; // this section carries no call to action — the ledger is the argument.

  const [headItem, headMonth, headYear] = S7_MATH.head;
  const [theirsLabel, theirsMonth, theirsYear] = S7_MATH.totalTheirs;
  const [oursLabel, oursMonth, oursYear] = S7_MATH.totalOurs;
  const lastIndex = S7_MATH.rows.length - 1;

  return (
    <Section tone="bone" id="math">
      <style>{S7_CSS}</style>

      <Eyebrow>{S7_MATH.eyebrow}</Eyebrow>
      <Display as="h2" size={T.d2} style={{ color: C.onBone }}>
        {S7_MATH.h2}
      </Display>

      <div className="s7-table" role="table">
        <div className="s7-row s7-hdr" role="row">
          <div className="s7-cell s7-c1" role="columnheader">{headItem}</div>
          <div className="s7-cell s7-c2" role="columnheader">{headMonth}</div>
          <div className="s7-cell s7-c3" role="columnheader">{headYear}</div>
        </div>

        {S7_MATH.rows.map(([item, month, year], i) => (
          <div
            className={i === lastIndex ? 's7-row s7-lastrow' : 's7-row'}
            role="row"
            key={item}
          >
            <div className="s7-cell s7-c1" role="rowheader">{item}</div>
            <div className="s7-cell s7-c2" role="cell">{month}</div>
            <div className="s7-cell s7-c3" role="cell">{year}</div>
          </div>
        ))}

        <div className="s7-thick" />

        <div className="s7-row s7-tot" role="row">
          <div className="s7-cell s7-c1" role="rowheader">{theirsLabel}</div>
          <div className="s7-cell s7-c2" role="cell">{theirsMonth}</div>
          <div className="s7-cell s7-c3" role="cell">{theirsYear}</div>
        </div>

        <div className="s7-row s7-ours" role="row">
          <div className="s7-cell s7-c1" role="rowheader">{oursLabel}</div>
          <div className="s7-cell s7-c2" role="cell">{oursMonth}</div>
          <div className="s7-cell s7-c3" role="cell">{oursYear}</div>
        </div>
      </div>

      <Display as="p" size={T.d3} style={{ color: C.onBone, marginTop: SP[4] }}>
        {S7_MATH.punchline}
      </Display>

      <div className="s7-footrule" />
      <p className="s7-foot">{S7_MATH.footnote}</p>
    </Section>
  );
}
