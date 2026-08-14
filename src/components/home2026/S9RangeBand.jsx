// S9 — THE RANGE BAND. The last thing on the page: a quiet strip, not a fourth pitch.
// Desktop: statement block left, three items right, bronze hairlines between them, a
// full-bleed bronze rule, then the footnote centred under it.
// Portrait: the statement goes big across the top, the three items become stacked rows
// divided by bronze rules — the reference's portrait solve, not the desktop grid squeezed.
import React, { useEffect, useState } from 'react';
import { S9_RANGE } from './copy';
import { C, F, T, SP, LS, LH, GUTTER, BP, Section, Eyebrow, Display, Body } from './tokens';
import { Reveal, Stagger, DUR } from './motion';

// The footnote's final phrase (the three words before the closing period) is the link.
// Derived from the frozen string so nothing user-visible is typed here.
function splitFootnote(sentence) {
  const dot = sentence.lastIndexOf('.');
  const head = dot === -1 ? sentence : sentence.slice(0, dot);
  const tail = dot === -1 ? '' : sentence.slice(dot);
  const words = head.split(' ');
  return {
    lead: words.slice(0, -3).join(' ') + ' ',
    link: words.slice(-3).join(' '),
    tail,
  };
}

// Display line breaks are hand-placed, never left to the browser. `counts` is how many words
// sit on each line before the last; the remainder finishes the final line. Derived from the
// frozen string, so the rendered text still reads back verbatim.
function splitLines(sentence, counts) {
  const words = sentence.split(' ');
  const lines = [];
  let i = 0;
  counts.forEach(n => {
    lines.push(words.slice(i, i + n).join(' '));
    i += n;
  });
  lines.push(words.slice(i).join(' '));
  return lines.filter(Boolean);
}

// Anton is far wider than the condensed face the reference was rendered in, so the statement
// cannot sit on one line at either width. Three lines in the narrow desktop column, two across
// the full portrait measure — both hand-placed.
const H2_DESKTOP = splitLines(S9_RANGE.h2, [3, 1]);
const H2_MOBILE = splitLines(S9_RANGE.h2, [3]);

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

const SCOPED_CSS = `
.s9-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 3fr);
  column-gap: ${SP[8]}px;
  align-items: stretch;
}
.s9-items {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: ${SP[6]}px;
  align-items: stretch;
}
/* Full-height cells so the dividers read as columns, not ticks — the reference's rules
   run the whole depth of the item block. */
.s9-item,
.s9-item-div {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.s9-item-div {
  border-left: 1px solid ${C.bronze};
  padding-left: ${SP[6]}px;
}
/* The closing rule runs edge to edge, like the bronze line that opens the band. */
.s9-rule {
  height: 1px;
  background: ${C.bronze};
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-top: ${SP[7]}px;
  margin-bottom: ${SP[8]}px;
}
.s9-foot { display: flex; justify-content: center; text-align: center; }

/* Between the desktop grid and the portrait solve the four columns get tight; pull the
   gutters in one step so no item line breaks three ways. */
@media (max-width: 1100px) {
  .s9-grid { column-gap: ${SP[6]}px; }
  .s9-items { column-gap: ${SP[5]}px; }
  .s9-item-div { padding-left: ${SP[5]}px; }
}

@media ${BP.mob} {
  .s9-grid {
    grid-template-columns: minmax(0, 1fr);
    row-gap: ${SP[7]}px;
  }
  .s9-items {
    grid-template-columns: minmax(0, 1fr);
    row-gap: ${SP[7]}px;
    align-items: start;
  }
  .s9-item,
  .s9-item-div {
    height: auto;
    display: block;
  }
  .s9-item-div {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid ${C.bronze};
    padding-top: ${SP[7]}px;
  }
  .s9-rule {
    width: 100%;
    margin-left: 0;
    margin-top: ${SP[7]}px;
    margin-bottom: ${SP[7]}px;
  }
  .s9-foot { justify-content: flex-start; text-align: left; }
}
`;

export default function S9RangeBand({ onOpenBrief }) {
  const isMobile = useIsMobile();
  const foot = splitFootnote(S9_RANGE.footnote);
  const h2Lines = isMobile ? H2_MOBILE : H2_DESKTOP;

  return (
    <Section
      tone="ink"
      short
      id="range"
      style={{
        borderTop: `1px solid ${C.bronze}`,
        // A band, not a section: tight to its own top and bottom edge, no dead air.
        padding: `${SP[8]}px ${GUTTER} ${SP[8]}px`,
        // Guards the full-bleed rule below — it can never push a horizontal scrollbar.
        overflowX: 'hidden',
      }}
    >
      <style>{SCOPED_CSS}</style>

      <div className="s9-grid">
        <Reveal className="s9-head">
          <Eyebrow style={{ marginBottom: SP[4] }}>{S9_RANGE.eyebrow}</Eyebrow>
          <Display
            as="h2"
            size={isMobile ? T.d2 : T.d3}
            style={{ color: C.onInk, lineHeight: LH.display }}
          >
            {h2Lines.map((line, i) => (
              <React.Fragment key={line}>
                {line}
                {i < h2Lines.length - 1 ? <>{' '}<br /></> : null}
              </React.Fragment>
            ))}
          </Display>
        </Reveal>

        <div className="s9-items">
          <Stagger style={{ display: 'contents' }} step={90} y={12} duration={DUR.quick}>
            {S9_RANGE.items.map((item, i) => (
              <div className={i === 0 ? 's9-item' : 's9-item s9-item-div'} key={item.title}>
                <Display as="h3" size={T.d4} style={{ color: C.onInk, marginBottom: SP[4] }}>
                  {item.title}
                </Display>
                <Body tone="ink">{item.body}</Body>
              </div>
            ))}
          </Stagger>
        </div>
      </div>

      <div className="s9-rule" aria-hidden="true" />

      <div className="s9-foot">
        <p
          style={{
            fontFamily: F.mono,
            fontSize: T.lbl,
            letterSpacing: LS.label,
            lineHeight: LH.body,
            textTransform: 'uppercase',
            color: C.onInkMute,
            margin: 0,
          }}
        >
          {foot.lead}
 {/* Was href="#the-range", a link to the section it already sits in, under copy
              promising "a different page". The linked phrase now does the real thing. */}
          <button
            type="button"
            onClick={onOpenBrief}
            style={{
              font: 'inherit',
              letterSpacing: 'inherit',
              textTransform: 'inherit',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: C.bronze,
              textDecoration: 'underline',
              textUnderlineOffset: SP[1],
            }}
          >
            {foot.link}
          </button>
          {foot.tail}
        </p>
      </div>
    </Section>
  );
}