// S8 — THE QUESTIONS. aheadofmarket.com home 2026.
// Reading section, bone paper, two ruled columns on desktop, one ruled stack on mobile.
// TYPE RULE (hard): questions + answers are the BODY grotesque, sentence case.
// Only the section headline is set in the condensed display face.

import React from 'react';
import { S8_QUESTIONS } from './copy';
import { C, F, SP, T, LS, LH, BP, Section, Eyebrow, Display } from './tokens';

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(BP.mob).matches
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia(BP.mob);
    const onChange = event => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return isMobile;
}

function QuestionBlock({ q, a, isMobile }) {
  return (
    <div
      style={{
        paddingBottom: isMobile ? SP[5] : SP[6],
        borderBottom: `1px solid ${C.bronzeDim}`,
      }}
    >
      <h3
        style={{
          fontFamily: F.body,
          fontWeight: 500,
          fontSize: T.d4,
          lineHeight: LH.head,
          letterSpacing: LS.body,
          color: C.onBone,
          margin: 0,
          marginBottom: SP[4],
        }}
      >
        {q}
      </h3>
      <p
        style={{
          fontFamily: F.body,
          fontWeight: 400,
          fontSize: T.b1,
          lineHeight: LH.body,
          letterSpacing: LS.body,
          color: C.onBoneMute,
          margin: 0,
        }}
      >
        {a}
      </p>
    </div>
  );
}

export default function S8Questions({ onOpenBrief }) {
  const isMobile = useIsMobile();
  const items = S8_QUESTIONS.qa;
  const rows = Math.ceil(items.length / 2);

  return (
    <Section tone="bone" short={isMobile} id="questions">
      <Eyebrow tone="bone" style={{ marginBottom: isMobile ? SP[4] : SP[5] }}>
        {S8_QUESTIONS.eyebrow}
      </Eyebrow>

      <Display
        as="h2"
        size={isMobile ? T.d3 : T.d2}
        tone="bone"
        style={{ color: C.onBone, maxWidth: '100%' }}
      >
        {S8_QUESTIONS.h2}
      </Display>

      {isMobile ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            rowGap: SP[7],
            marginTop: SP[8],
          }}
        >
          {items.map(item => (
            <QuestionBlock key={item.q} q={item.q} a={item.a} isMobile />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1px 1fr',
            columnGap: SP[9],
            rowGap: SP[8],
            marginTop: SP[10],
            alignItems: 'start',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              gridColumn: 2,
              gridRow: `1 / ${rows + 1}`,
              alignSelf: 'stretch',
              width: 1,
              background: C.bronzeDim,
            }}
          />
          {items.map((item, i) => (
            <div
              key={item.q}
              style={{
                gridColumn: i < rows ? 1 : 3,
                gridRow: (i % rows) + 1,
              }}
            >
              <QuestionBlock q={item.q} a={item.a} isMobile={false} />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
