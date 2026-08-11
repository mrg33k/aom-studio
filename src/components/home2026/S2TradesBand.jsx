// S2 — the trades band. Short, reversed on black, pure type, no photography, no CTA.
// Copy: S2_TRADES (frozen). Tokens: tokens.js. Nothing local is invented.

import React, { useEffect, useState } from 'react';
import { S2_TRADES } from './copy';
import { C, F, T, LS, LH, SP, BP, Section, Display, Body, Rule } from './tokens';

// The headline is ONE frozen string. It is split on its own sentence breaks purely so each
// trade can carry the bronze marker and never break mid-word; re-joined it is byte-identical.
const TRADES = S2_TRADES.h2.split('. ').map((part, i, all) => (i === all.length - 1 ? part : `${part}.`));

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(BP.mob);
    const sync = () => setIsMobile(mq.matches);
    sync();
    if (mq.addEventListener) {
      mq.addEventListener('change', sync);
      return () => mq.removeEventListener('change', sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);
  return isMobile;
}

const markStyle = {
  display: 'inline-block',
  width: '0.115em',
  height: '0.115em',
  marginLeft: '0.07em',
  background: C.bronze,
  verticalAlign: 'baseline',
};

export default function S2TradesBand({ onOpenBrief }) {
  const isMobile = useIsMobile();

  return (
    <Section tone="ink" short id="trades">
      <Display
        as="h2"
        size={T.d2}
        style={{
          fontFamily: F.display,
          color: C.onInk,
          lineHeight: LH.display,
          letterSpacing: LS.display,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          columnGap: isMobile ? SP[3] : SP[5],
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

      <Rule
        tone="ink"
        style={{
          background: C.bronze,
          marginTop: isMobile ? SP[5] : SP[6],
          marginBottom: isMobile ? SP[4] : SP[5],
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? SP[2] : SP[3] }}>
        <Body size={T.b1} tone="ink">{S2_TRADES.body1}</Body>
        <Body size={T.b1} tone="ink">{S2_TRADES.body2}</Body>
      </div>
    </Section>
  );
}
