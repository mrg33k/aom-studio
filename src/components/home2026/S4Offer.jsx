// S4 — THE OFFER. One price, two grouped lists, the page's primary CTA.
// Reference: deliverables/offer-v3-2026-08-10/the-whole-department.png (desktop)
//            deliverables/mobile-2026-08-10/m3-the-offer.png (portrait)
import React from 'react';
import {
  C, F, T, SP, LS, LH,
  Section, Eyebrow, Display, Rule, Cta,
} from './tokens';
import { S4_OFFER, S1_HERO } from './copy';

const CSS = `
.s4-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${SP[7]}px;
  align-items: start;
}
.s4-h { font-size: ${T.d3}; }
.s4-pricebox { text-align: right; }
.s4-price { font-size: ${T.d1}; }
.s4-pricesub {
  font-family: ${F.mono};
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  line-height: ${LH.body};
  color: ${C.onInk};
  margin: ${SP[4]}px 0 0;
  text-transform: uppercase;
}
.s4-lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${SP[7]}px;
  margin-top: ${SP[10]}px;
}
.s4-col2 {
  border-left: 1px solid ${C.bronzeDim};
  padding-left: ${SP[7]}px;
}
.s4-grouplabel {
  font-family: ${F.mono};
  font-weight: 400;
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  line-height: ${LH.body};
  text-transform: uppercase;
  color: ${C.bronze};
  margin: 0 0 ${SP[5]}px;
}
.s4-items { list-style: none; margin: 0; padding: 0; }
.s4-item {
  font-family: ${F.body};
  font-weight: 700;
  font-size: ${T.b1};
  line-height: ${LH.body};
  letter-spacing: ${LS.body};
  text-transform: uppercase;
  color: ${C.onInk};
  padding: ${SP[3]}px 0;
  border-bottom: 1px solid ${C.bronzeDim};
}
.s4-item:last-child { border-bottom: none; }
.s4-terms {
  font-family: ${F.mono};
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  line-height: ${LH.body};
  text-transform: uppercase;
  color: ${C.onInkMute};
  text-align: center;
  margin: ${SP[5]}px auto 0;
  max-width: 90ch;
}
.s4-ctawrap { margin-top: ${SP[8]}px; text-align: center; }

@media (max-width: 768px) {
  .s4-top { grid-template-columns: 1fr; gap: ${SP[4]}px; }
  .s4-h { font-size: ${T.d2}; }
  .s4-pricebox { text-align: left; }
  .s4-price { font-size: 30vw; }
  .s4-pricesub { text-align: center; margin-top: ${SP[2]}px; }
  .s4-lists {
    grid-template-columns: 1fr;
    gap: ${SP[6]}px;
    margin-top: ${SP[6]}px;
    border-top: 1px solid ${C.bronzeDim};
    padding-top: ${SP[6]}px;
  }
  .s4-col2 { border-left: none; padding-left: 0; }
  .s4-item:last-child { border-bottom: 1px solid ${C.bronzeDim}; }
  .s4-ctawrap { margin-top: ${SP[6]}px; }
  .s4-ctawrap button { width: 100%; }
}
`;

export default function S4Offer({ onOpenBrief }) {
  return (
    <Section tone="ink" id="offer">
      <style>{CSS}</style>

      <div className="s4-top">
        <div>
          <Eyebrow>{S4_OFFER.eyebrow}</Eyebrow>
          <Display as="h2" size="inherit" style={{ color: C.onInk }}>
            <span className="s4-h" style={{ display: 'block' }}>{S4_OFFER.h2a}</span>
            <span className="s4-h" style={{ display: 'block' }}>{S4_OFFER.h2b}</span>
          </Display>
        </div>

        <div className="s4-pricebox">
          <Display
            as="div"
            size="inherit"
            style={{ color: C.bronze, lineHeight: LH.display }}
          >
            <span className="s4-price" style={{ display: 'block' }}>{S4_OFFER.price}</span>
          </Display>
          <p className="s4-pricesub">{S4_OFFER.priceSub}</p>
        </div>
      </div>

      <div className="s4-lists">
        <div className="s4-col">
          <h3 className="s4-grouplabel">{S4_OFFER.group1Label}</h3>
          <ul className="s4-items">
            {S4_OFFER.group1.map(item => (
              <li className="s4-item" key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="s4-col s4-col2">
          <h3 className="s4-grouplabel">{S4_OFFER.group2Label}</h3>
          <ul className="s4-items">
            {S4_OFFER.group2.map(item => (
              <li className="s4-item" key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <Rule style={{ background: C.bronzeDim, marginTop: SP[8] }} />

      <p className="s4-terms">{S4_OFFER.terms}</p>

      <div className="s4-ctawrap">
        <Cta onClick={onOpenBrief}>{S1_HERO.cta}</Cta>
      </div>
    </Section>
  );
}
