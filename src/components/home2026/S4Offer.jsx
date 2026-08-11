// S4 — THE OFFER. One price, two grouped lists, the page's primary CTA.
// Reference: deliverables/offer-v3-2026-08-10/the-whole-department.png (desktop)
//            deliverables/mobile-2026-08-10/m3-the-offer.png (portrait)
//
// Reference reading notes (measured off the renders, not eyeballed):
//  - Section top pad in the render is about one eyebrow-gap, NOT a band. The shipped 128px
//    top pad was the "dead black band" the client caught. Overridden locally to SP7/SP5.
//  - Headline sits at 68% of the measure, price flush right at 27% of it. Anton at T.d3 lands
//    the headline line at ~810px against the render's ~894px — same relationship, and the
//    price at T.d1 measures 353px against the render's 376px. Both stay on the token scale.
//  - Price cap-top aligns with the eyebrow, so the price bottom falls between headline line 1
//    and line 2. `align-items:start` on the top row is what produces that.
//  - Every list row carries a gold hairline under it except the last of each column, and the
//    column divider is the same gold. The render's hairlines read clearly; bronzeDim did not.
//  - Portrait is a different composition: headline over price over one stacked list, price
//    full-measure so the number lands before any scroll, CTA as a full-bleed bronze bar.
//
// MOTION: the two lists accumulate (first-month group, then every-month group). Nothing else
// in this section moves — the price gets no move at all, per the price-does-not-perform rule.
import React from 'react';
import {
  C, F, T, SP, LS, LH, GUTTER,
  Section, Eyebrow, Display, Rule, Cta,
} from './tokens';
import { Reveal, DUR } from './motion';
import { S4_OFFER, S1_HERO } from './copy';

// Same cadence the shared Stagger primitive uses. Reveal is driven directly here because
// Stagger wraps each child in a <div>, which cannot legally sit between <ul> and <li>.
const STEP = 70;
const GROUP2_BASE = (S4_OFFER.group1.length + 1) * STEP;

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
  margin: ${SP[5]}px 0 0;
  text-transform: uppercase;
}
.s4-lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${SP[6]}px;
  margin-top: ${SP[7]}px;
}
.s4-col2 {
  border-left: 1px solid ${C.bronze};
  padding-left: ${SP[5]}px;
}
.s4-grouplabel {
  font-family: ${F.mono};
  font-weight: 400;
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  line-height: ${LH.body};
  text-transform: uppercase;
  color: ${C.bronze};
  margin: 0 0 ${SP[6]}px;
}
.s4-items { list-style: none; margin: 0; padding: 0; }
.s4-item {
  font-family: ${F.body};
  font-weight: 700;
  font-size: ${T.b2};
  line-height: ${LH.body};
  letter-spacing: ${LS.body};
  text-transform: uppercase;
  color: ${C.onInk};
  padding: ${SP[3]}px 0;
  border-bottom: 1px solid ${C.bronze};
}
.s4-items > li:last-child { border-bottom: none; }
.s4-terms {
  font-family: ${F.mono};
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  line-height: ${LH.body};
  text-transform: uppercase;
  color: ${C.onInk};
  text-align: center;
  margin: ${SP[5]}px auto 0;
  max-width: 90ch;
}
.s4-ctawrap { margin-top: ${SP[7]}px; text-align: center; }

@media (max-width: 768px) {
  .s4-top { grid-template-columns: 1fr; gap: ${SP[4]}px; }
  .s4-pricebox { text-align: center; }
  /* Full-measure on a 390px phone: "$3,000" in Anton runs ~2.66em, so 32vw fills the
     gutters without touching them. The number has to land before any scrolling. */
  .s4-price { font-size: 32vw; }
  .s4-pricesub { margin-top: ${SP[2]}px; }
  .s4-lists {
    grid-template-columns: 1fr;
    gap: ${SP[5]}px;
    margin-top: ${SP[5]}px;
    border-top: 1px solid ${C.bronze};
    padding-top: ${SP[5]}px;
  }
  .s4-col2 { border-left: none; padding-left: 0; }
  .s4-item { padding: ${SP[2]}px 0; }
  /* The first group's last row still needs its rule — the next group's label follows it. */
  .s4-items > li:last-child { border-bottom: 1px solid ${C.bronze}; }
  .s4-terms { margin-top: ${SP[4]}px; }
  .s4-ctawrap { margin-top: ${SP[5]}px; }
  .s4-ctawrap button {
    width: calc(100% + 2 * ${GUTTER});
    margin-left: calc(-1 * ${GUTTER});
  }
}
`;

// One group of the offer. Label first, then its rows, each arriving one step after the last —
// the accumulation IS the argument, so the reader watches the volume stack up.
function OfferGroup({ label, items, base, className }) {
  return (
    <div className={className}>
      <Reveal
        as="h3"
        className="s4-grouplabel"
        delay={base}
        y={14}
        duration={DUR.quick}
        threshold={0.12}
      >
        {label}
      </Reveal>
      <ul className="s4-items">
        {items.map((item, i) => (
          <Reveal
            key={item}
            as="li"
            className="s4-item"
            delay={base + (i + 1) * STEP}
            y={14}
            duration={DUR.quick}
            threshold={0.12}
          >
            {item}
          </Reveal>
        ))}
      </ul>
    </div>
  );
}

export default function S4Offer({ onOpenBrief }) {
  return (
    <Section
      tone="ink"
      id="offer"
      style={{
        // The render opens on the eyebrow, not on a band of black. Ends tight too.
        paddingTop: `clamp(${SP[5]}px, 4vw, ${SP[7]}px)`,
        paddingBottom: `clamp(${SP[6]}px, 5vw, ${SP[8]}px)`,
      }}
    >
      <style>{CSS}</style>

      <div className="s4-top">
        <div>
          <Eyebrow>{S4_OFFER.eyebrow}</Eyebrow>
          {/* Both breaks are hand-placed: the render breaks after "DOES." on desktop, and in
              portrait the first clause takes two lines of its own. */}
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
        <OfferGroup
          className="s4-col"
          label={S4_OFFER.group1Label}
          items={S4_OFFER.group1}
          base={0}
        />
        <OfferGroup
          className="s4-col s4-col2"
          label={S4_OFFER.group2Label}
          items={S4_OFFER.group2}
          base={GROUP2_BASE}
        />
      </div>

      <Rule style={{ background: C.bronze, marginTop: SP[6] }} />

      <p className="s4-terms">{S4_OFFER.terms}</p>

      <div className="s4-ctawrap">
        <Cta onClick={onOpenBrief}>{S1_HERO.cta}</Cta>
      </div>
    </Section>
  );
}
