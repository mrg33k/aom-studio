// S3 — THE MONTH. Bone paper.
//
// v2 (2026-08-11). This section used to be five milestones under a headline promising thirty
// days, which left days 2-29 blank and made the whole page read as a production schedule
// rather than a service. It is now the month itself: four weeks by three rows.
//
// The third row, YOU DO, is why the section exists. A contractor's real fear about hiring
// anyone is not the money, it is how much of his own time it eats — and "Nothing." printed
// twice down that row is the strongest sentence on this page.
//
// Desktop: a matrix. A left rail carries the three row labels ONCE (twelve repeated labels
// would be noise), four week columns hang off it, and hairlines run the full width so the
// rows read across. The spine draws above it.
// Mobile: the spine rotates vertical and the reader descends it week by week, each week
// carrying its own three labelled lines.
//
// MOTION — unchanged in kind. The spine DRAWS itself (the line IS the month) and each week
// lights as the line reaches it. Nothing else moves. See motion.jsx for the rule.
import React, { useState, useEffect } from 'react';
import {
  C, F, SP, T, LS, LH, BP,
  Section, Eyebrow, Display, Body, Rule,
} from './tokens';
import { S3_HOW } from './copy';
import { DrawLine, Reveal, DUR } from './motion';

// Evidence photographs clip into the spine above weeks one, two and four.
const EVIDENCE = {
  0: '/home2026/evidence-01.jpg',
  1: '/home2026/evidence-02.jpg',
  3: '/home2026/evidence-03.jpg',
};
// The one photograph that survives the portrait re-composition, full bleed after week two.
const MOBILE_EVIDENCE_WEEK = 1;

// Timing. The desktop spine draws in DUR.draw (1400ms) and the four weeks ride it, a quarter
// of the draw apart, so week one has fully resolved before week four begins. On the phone the
// reader supplies the travel by scrolling, so the per-week gap is short — a stall would be
// worse than no cascade at all.
const WEEK_STEP = DUR.draw / 4;      // 350ms
const MOBILE_WEEK_STEP = 120;
const PART_STEP = 90;                // label -> we -> get -> you inside one week

// The headline is ONE frozen string. Desktop sets it on one line, exactly as the reference
// does. Portrait breaks it after the first sentence — a HAND-PLACED break, not the browser's.
// The clauses are sliced out of the copy string and re-joined with their own punctuation and
// space, so the rendered text still reads back as S3_HOW.h2 verbatim.
const H2_CLAUSES = S3_HOW.h2.split('. ');
const H2_LINES = H2_CLAUSES.map((clause, i) => (
  i < H2_CLAUSES.length - 1 ? `${clause}. ` : clause
));

const ROW_KEYS = ['we', 'get', 'you'];

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
.s3-root { --s3-bronze: ${C.bronze}; --s3-rule: ${C.ruleOnBone}; }
.s3-img { width: 100%; height: 100%; object-fit: cover; display: block; filter: grayscale(1) contrast(1.04); }
.s3-corner { position: absolute; width: ${SP[5]}px; height: ${SP[5]}px; border-color: var(--s3-bronze); border-style: solid; border-width: 0; }
.s3-corner-tl { top: -${SP[2]}px; left: -${SP[2]}px; border-top-width: 2px; border-left-width: 2px; }
.s3-corner-tr { top: -${SP[2]}px; right: -${SP[2]}px; border-top-width: 2px; border-right-width: 2px; }
.s3-corner-bl { bottom: -${SP[2]}px; left: -${SP[2]}px; border-bottom-width: 2px; border-left-width: 2px; }
.s3-corner-br { bottom: -${SP[2]}px; right: -${SP[2]}px; border-bottom-width: 2px; border-right-width: 2px; }

/* The rail column is fixed so the three row labels never reflow; the four weeks share the
   rest equally. Both grids below use the SAME template, which is what keeps the evidence
   photographs sitting over their own week. */
.s3-grid { display: grid; grid-template-columns: 148px repeat(4, 1fr); gap: ${SP[6]}px; }
@media (max-width: 1080px) { .s3-grid { grid-template-columns: 116px repeat(4, 1fr); gap: ${SP[4]}px; } }

.s3-rowlabel {
  font-family: ${F.mono};
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  text-transform: uppercase;
  color: ${C.bronze};
  padding-top: ${SP[4]}px;
}
.s3-cell { padding-top: ${SP[4]}px; padding-bottom: ${SP[5]}px; }

/* YOU DO is the answer to the reader's real question, so it is set in the display face at
   sub-display size rather than as another paragraph. "Nothing." has to land. */
.s3-youdo {
  font-family: ${F.display};
  font-weight: 400;
  /* Held just under T.d4. At d4 the week-four line ran to three deep lines and outweighed the
     two NOTHINGs, which inverts the whole point of the row. */
  font-size: clamp(18px, 1.7vw, 25px);
  line-height: ${LH.head};
  letter-spacing: ${LS.display};
  text-transform: uppercase;
  color: ${C.onBone};
  margin: 0;
}
.s3-standing {
  font-family: ${F.mono};
  font-size: ${T.lbl};
  letter-spacing: ${LS.label};
  text-transform: uppercase;
  color: ${C.bronze};
  margin: 0;
}
`;

function EvidenceFrame({ src, alt }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1',
        background: C.boneSoft,
      }}
    >
      <img className="s3-img" src={src} alt={alt} />
      <span className="s3-corner s3-corner-tl" aria-hidden="true" />
      <span className="s3-corner s3-corner-tr" aria-hidden="true" />
      <span className="s3-corner s3-corner-bl" aria-hidden="true" />
      <span className="s3-corner s3-corner-br" aria-hidden="true" />
    </div>
  );
}

function WeekLabel({ children, size = T.d4 }) {
  return (
    <div
      style={{
        fontFamily: F.display,
        fontWeight: 400,
        fontSize: size,
        lineHeight: LH.head,
        letterSpacing: LS.display,
        textTransform: 'uppercase',
        color: C.bronze,
      }}
    >
      {children}
    </div>
  );
}

function SectionHead({ split }) {
  return (
    <div>
      <Eyebrow tone="bone">{S3_HOW.eyebrow}</Eyebrow>
      <Display as="h2" size={T.d2} style={{ color: C.onBone, lineHeight: LH.display }}>
        {split
          ? H2_LINES.map((line, i) => (
            <span key={i} style={{ display: 'block' }}>{line}</span>
          ))
          : S3_HOW.h2}
      </Display>
    </div>
  );
}

// The spine plus the three evidence photographs. Shares the matrix template so a photograph
// always sits over the week it belongs to.
function DesktopSpine() {
  const { weeks } = S3_HOW;
  return (
    <div style={{ position: 'relative', marginTop: SP[8] }}>
      {/* THE SPINE. It begins and ends with the content measure — never the viewport. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1 }}
      >
        <DrawLine
          axis="x"
          thickness={1}
          color={C.bronze}
          duration={DUR.draw}
          threshold={0.05}
          style={{ width: '100%' }}
        />
        {/* the arrowhead arrives as the draw lands, at the end of the measure */}
        <Reveal
          delay={DUR.draw - 140}
          y={0}
          duration={DUR.quick}
          threshold={0.05}
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: `${SP[2]}px solid transparent`,
            borderBottom: `${SP[2]}px solid transparent`,
            borderLeft: `${SP[3]}px solid ${C.bronze}`,
          }}
        />
      </div>

      <div className="s3-grid" style={{ alignItems: 'stretch' }}>
        <div />
        {weeks.map((wk, i) => (
          <div key={wk.n} style={{ display: 'flex' }}>
            {EVIDENCE[i] ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: 184,
                }}
              >
                <EvidenceFrame src={EVIDENCE[i]} alt={wk.n} />
                {/* the drop connector belongs to the week, so it lights with it */}
                <Reveal
                  delay={i * WEEK_STEP}
                  y={0}
                  duration={DUR.base}
                  threshold={0.05}
                  style={{
                    flex: 1,
                    minHeight: SP[8],
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ flex: 1, width: 0, borderLeft: `1px dashed ${C.bronze}` }}
                  />
                  <span
                    aria-hidden="true"
                    style={{
                      width: SP[4],
                      height: SP[4],
                      borderRadius: '50%',
                      background: C.bronze,
                      marginBottom: -SP[2],
                      flex: '0 0 auto',
                    }}
                  />
                </Reveal>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// The matrix. Rendered ROW BY ROW into one grid so a hairline can run the full measure and
// the three rows read across all four weeks. Rendering week-by-week would put each week in
// its own column stack and the rows would drift out of line the moment one cell wrapped.
function DesktopMatrix() {
  const { weeks, rowLabels } = S3_HOW;
  return (
    <div style={{ marginTop: SP[6] }}>
      {/* week header row */}
      <div className="s3-grid">
        <div />
        {weeks.map((wk, i) => (
          <Reveal key={wk.n} delay={i * WEEK_STEP} y={10} duration={DUR.quick} threshold={0.05}>
            <WeekLabel>{wk.n}</WeekLabel>
          </Reveal>
        ))}
      </div>

      {ROW_KEYS.map((key, r) => (
        <React.Fragment key={key}>
          <Rule tone="bone" style={{ marginTop: SP[4] }} />
          <div className="s3-grid">
            <div className="s3-rowlabel">{rowLabels[key]}</div>
            {weeks.map((wk, i) => (
              <Reveal
                key={wk.n}
                delay={i * WEEK_STEP + (r + 1) * PART_STEP}
                y={10}
                duration={DUR.quick}
                threshold={0.05}
                className="s3-cell"
              >
                {key === 'you'
                  ? <p className="s3-youdo">{wk[key]}</p>
                  : <Body tone="bone">{wk[key]}</Body>}
              </Reveal>
            ))}
          </div>
        </React.Fragment>
      ))}

      <Rule tone="bone" />
      <div className="s3-grid" style={{ marginTop: SP[5] }}>
        <div />
        <p className="s3-standing" style={{ gridColumn: '2 / -1' }}>{S3_HOW.standing}</p>
      </div>
    </div>
  );
}

// The closer. This sentence used to be question six of six at the bottom of the page — the
// warmest line we own, wasted. It belongs here, under the month it describes.
function Closer({ isMobile }) {
  return (
    // SP[7] not SP[9]: at 72 the standing line and the closer were separated by a dead cream
    // band, which is the same empty-band note this page has already been pulled up on twice.
    <Reveal delay={120} threshold={0.2} style={{ marginTop: isMobile ? SP[6] : SP[7] }}>
      <div style={{ borderTop: `1px solid ${C.bronze}`, paddingTop: isMobile ? SP[5] : SP[6] }}>
        {/* Subordinate to the section headline on purpose. At T.d3 it read as a second h2 and
            the two display blocks fought; the closer is a reassurance, not an argument. */}
        <Display
          as="p"
          size={isMobile ? T.b1 : T.d4}
          style={{ color: C.onBone, maxWidth: isMobile ? '100%' : '62%' }}
        >
          {S3_HOW.closer}
        </Display>
      </div>
    </Reveal>
  );
}

function MobileFlow() {
  const { weeks, rowLabels } = S3_HOW;
  return (
    <div style={{ position: 'relative' }}>
      {/* the spine, rotated vertical — it starts above the eyebrow and descends the section */}
      <DrawLine
        axis="y"
        thickness={1}
        color={C.bronze}
        duration={DUR.draw}
        threshold={0.02}
        style={{ position: 'absolute', left: 0, top: 0, height: '100%', zIndex: 2 }}
      />
      <Reveal
        delay={DUR.draw - 140}
        y={0}
        duration={DUR.quick}
        threshold={0.05}
        style={{
          position: 'absolute',
          left: -SP[2] + 1,
          bottom: -SP[3],
          width: 0,
          height: 0,
          borderLeft: `${SP[2]}px solid transparent`,
          borderRight: `${SP[2]}px solid transparent`,
          borderTop: `${SP[3]}px solid ${C.bronze}`,
          zIndex: 2,
        }}
      />

      <div style={{ paddingLeft: SP[7] }}>
        <SectionHead split />
      </div>

      {weeks.map((wk, i) => {
        const base = i * MOBILE_WEEK_STEP;
        return (
          <React.Fragment key={wk.n}>
            <div
              style={{
                position: 'relative',
                paddingLeft: SP[7],
                marginTop: i === 0 ? SP[7] : SP[6],
                zIndex: 2,
              }}
            >
              {/* the node and its tick on the spine */}
              <Reveal
                delay={base}
                y={0}
                duration={DUR.quick}
                threshold={0.05}
                style={{
                  position: 'absolute',
                  left: -SP[1],
                  top: SP[1],
                  width: SP[2],
                  height: SP[2],
                  borderRadius: '50%',
                  background: C.bronze,
                }}
              />
              <Reveal
                delay={base}
                y={0}
                duration={DUR.quick}
                threshold={0.05}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: SP[2],
                  width: SP[6],
                  height: 1,
                  background: C.bronze,
                }}
              />

              <Reveal delay={base} y={10} duration={DUR.quick} threshold={0.05}>
                <WeekLabel size={T.d3}>{wk.n}</WeekLabel>
              </Reveal>

              {ROW_KEYS.map((key, r) => (
                <Reveal
                  key={key}
                  delay={base + (r + 1) * PART_STEP}
                  y={10}
                  duration={DUR.quick}
                  threshold={0.05}
                  style={{ marginTop: r === 0 ? SP[4] : SP[4] }}
                >
                  <div className="s3-rowlabel" style={{ paddingTop: 0, marginBottom: SP[1] }}>
                    {rowLabels[key]}
                  </div>
                  {key === 'you'
                    ? <p className="s3-youdo">{wk[key]}</p>
                    : <Body tone="bone">{wk[key]}</Body>}
                </Reveal>
              ))}
            </div>

            {i === MOBILE_EVIDENCE_WEEK ? (
              <div
                style={{
                  position: 'relative',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '100vw',
                  aspectRatio: '16 / 5',
                  marginTop: SP[5],
                  background: C.boneSoft,
                  zIndex: 1,
                }}
              >
                <img className="s3-img" src={EVIDENCE[i]} alt={wk.n} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}

      <div style={{ paddingLeft: SP[7] }}>
        <Reveal delay={80} threshold={0.2} style={{ marginTop: SP[6] }}>
          <p className="s3-standing">{S3_HOW.standing}</p>
        </Reveal>
        <Closer isMobile />
      </div>
    </div>
  );
}

export default function S3HowItRuns({ onOpenBrief }) {
  const isMobile = useIsMobile();
  void onOpenBrief; // this section carries no call to action — the month is the argument

  return (
    <Section
      tone="bone"
      id="how-it-runs"
      style={{
        overflow: 'hidden',
        // the reference opens on the eyebrow almost immediately; the shared 128 top left a
        // dead band between the section edge and the first element.
        paddingTop: isMobile ? SP[7] : SP[9],
        ...(isMobile ? { paddingBottom: SP[8] } : null),
      }}
    >
      <style>{SCOPED_CSS}</style>
      <div className="s3-root">
        {isMobile ? (
          <MobileFlow />
        ) : (
          <React.Fragment>
            <SectionHead />
            <DesktopSpine />
            <DesktopMatrix />
            <Closer isMobile={false} />
          </React.Fragment>
        )}
      </div>
    </Section>
  );
}
