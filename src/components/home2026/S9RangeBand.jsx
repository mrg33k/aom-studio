// S9 — THE RANGE BAND. The last thing on the page: a quiet strip, not a fourth pitch.
import React from 'react';
import { S9_RANGE } from './copy';
import { C, F, T, SP, LS, LH, Section, Eyebrow, Display, Body } from './tokens';

// The footnote's final phrase (the three words before the closing period) links to /film.
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

export default function S9RangeBand({ onOpenBrief }) {
  const foot = splitFootnote(S9_RANGE.footnote);

  return (
    <Section
      tone="ink"
      short
      id="range"
      style={{ borderTop: `1px solid ${C.bronze}` }}
    >
      <style>{`
        .s9-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) repeat(3, minmax(0, 1fr));
          column-gap: ${SP[7]}px;
          align-items: end;
        }
        .s9-item + .s9-item,
        .s9-items > .s9-item:first-child {
          border-left: 1px solid ${C.bronzeDim};
          padding-left: ${SP[6]}px;
        }
        .s9-head { padding-right: ${SP[6]}px; }
        .s9-foot {
          display: flex;
          justify-content: center;
          text-align: center;
        }
        @media (max-width: 768px) {
          .s9-grid {
            grid-template-columns: minmax(0, 1fr);
            row-gap: ${SP[7]}px;
            align-items: start;
          }
          .s9-item + .s9-item,
          .s9-items > .s9-item:first-child {
            border-left: none;
            padding-left: 0;
          }
          .s9-item + .s9-item {
            border-top: 1px solid ${C.bronzeDim};
            padding-top: ${SP[7]}px;
          }
          .s9-head { padding-right: 0; }
          .s9-foot { text-align: left; justify-content: flex-start; }
        }
      `}</style>

      <div className="s9-grid s9-items">
        <div className="s9-head">
          <Eyebrow style={{ marginBottom: SP[4] }}>{S9_RANGE.eyebrow}</Eyebrow>
          <Display as="h2" size={T.d3} style={{ color: C.onInk }}>
            {S9_RANGE.h2}
          </Display>
        </div>

        {S9_RANGE.items.map(item => (
          <div className="s9-item" key={item.title}>
            <Display as="h3" size={T.d4} style={{ color: C.onInk, marginBottom: SP[3] }}>
              {item.title}
            </Display>
            <Body tone="ink">{item.body}</Body>
          </div>
        ))}
      </div>

      <div
        style={{
          height: 1,
          background: C.bronzeDim,
          width: '100%',
          marginTop: SP[9],
          marginBottom: SP[6],
        }}
      />

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
          <a
            href="#the-range"
            style={{
              color: C.bronze,
              textDecoration: 'underline',
              textUnderlineOffset: SP[1],
            }}
          >
            {foot.link}
          </a>
          {foot.tail}
        </p>
      </div>
    </Section>
  );
}
