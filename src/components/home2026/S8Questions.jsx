// S8 — THE QUESTIONS. aheadofmarket.com home 2026.
// Reading section, bone paper, two ruled columns on desktop, one ruled stack on mobile.
// TYPE RULE (hard): questions + answers are the BODY grotesque, sentence case.
// Only the section headline is set in the condensed display face.
// Sized to its content — every answer is visible, there is no accordion.

import React from 'react';
import { S8_QUESTIONS } from './copy';
import { C, F, SP, T, LS, LH, BP, GUTTER, Section, Eyebrow, Display } from './tokens';
import { Reveal, DUR } from './motion';

// The reference sets the section headline as ONE full-measure line. Anton is materially wider
// than the condensed face the render used, so T.d2 (84px at 1440) wraps and leaves an orphan
// "CALLING." on its own line. This is the fitted size that keeps the reference's single band:
// it is a section-local value, not a new step on the shared scale — see tokens.jsx T.
const H2_DESKTOP = 'clamp(38px, 5.1vw, 73px)';

// Hand-placed line breaks. The reference breaks every desktop answer to exactly two lines, which
// is also what makes the hairlines align across the two columns. Indices are word counts, not
// strings — every visible character still comes from copy.js verbatim.
// Index 5 is the v2 replacement answer ("How much of my time does this take?"), which is
// longer than the line it replaced — hence 12 rather than 9.
const ANSWER_BREAK = [7, 10, 10, 10, 10, 12];
const H2_BREAK_MOBILE = 5;

// Insert a newline after `wordIndex` words. Rendered with white-space: pre-line, so the text
// content still normalises back to the exact copy.js string.
function hardBreak(text, wordIndex) {
  const words = text.split(' ');
  if (!wordIndex || wordIndex >= words.length) return text;
  return `${words.slice(0, wordIndex).join(' ')}\n${words.slice(wordIndex).join(' ')}`;
}

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
          marginBottom: isMobile ? SP[4] : SP[5],
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
          whiteSpace: 'pre-line',
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
    <Section
      tone="bone"
      id="questions"
      style={{ padding: `${isMobile ? SP[9] : SP[10]}px ${GUTTER}` }}
    >
      <Eyebrow tone="bone" style={{ marginBottom: isMobile ? SP[4] : SP[5] }}>
        {S8_QUESTIONS.eyebrow}
      </Eyebrow>

      <Display
        as="h2"
        size={isMobile ? T.d3 : H2_DESKTOP}
        tone="bone"
        style={{ color: C.onBone, maxWidth: '100%', whiteSpace: 'pre-line' }}
      >
        {isMobile ? hardBreak(S8_QUESTIONS.h2, H2_BREAK_MOBILE) : S8_QUESTIONS.h2}
      </Display>

      {isMobile ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            rowGap: SP[5],
            marginTop: SP[6],
          }}
        >
          {items.map((item, i) => (
            <Reveal
              key={item.q}
              delay={Math.min(i, 2) * 70}
              y={14}
              duration={DUR.quick}
              threshold={0.12}
            >
              <QuestionBlock q={item.q} a={item.a} isMobile />
            </Reveal>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1px 1fr',
            columnGap: SP[8],
            rowGap: SP[6],
            marginTop: SP[9],
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
            <Reveal
              key={item.q}
              delay={(i % rows) * 70}
              y={14}
              duration={DUR.quick}
              threshold={0.12}
              style={{ gridColumn: i < rows ? 1 : 3, gridRow: (i % rows) + 1 }}
            >
              <QuestionBlock
                q={item.q}
                a={hardBreak(item.a, ANSWER_BREAK[i])}
                isMobile={false}
              />
            </Reveal>
          ))}
        </div>
      )}
    </Section>
  );
}
