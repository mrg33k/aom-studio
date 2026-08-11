// S3 — THE FIVE-STATION SPINE. Bone paper.
// Desktop: five stations on one horizontal bronze spine that begins and ends with the
// content measure, three evidence photos clipped in above it.
// Mobile: the spine rotates vertical, runs the full height of the section from above the
// eyebrow to below station 05, and the reader descends it.
//
// MOTION — the story move of the page. The spine DRAWS itself (DrawLine, axis x on desktop,
// axis y on the phone) and each station lights as the line reaches it: number, then title,
// then body. Station 01 has resolved before station 05 starts. The line is the month passing.
import React, { useState, useEffect } from 'react';
import {
  C, F, SP, T, LS, LH, BP,
  Section, Eyebrow, Display, Body,
} from './tokens';
import { S3_HOW } from './copy';
import { DrawLine, Reveal, DUR } from './motion';

// Evidence photographs clip into the spine above stations 01, 02 and 04.
const EVIDENCE = {
  0: '/home2026/evidence-01.jpg',
  1: '/home2026/evidence-02.jpg',
  3: '/home2026/evidence-03.jpg',
};
// The one photograph that survives the portrait re-composition, full bleed after station 02.
const MOBILE_EVIDENCE_STATION = 1;

// Timing. The desktop spine draws in DUR.draw (1400ms) and the five stations ride it, one
// fifth of the draw apart, so 01 has fully resolved (0 + 2*PART_STEP + DUR.quick = 560ms)
// long before 05 begins (1120ms). On the phone the reader supplies the travel by scrolling,
// so the per-station gap is short — a stall would be worse than no cascade at all.
const STATION_STEP = DUR.draw / 5;   // 280ms
const MOBILE_STATION_STEP = 120;
const PART_STEP = 90;                // number -> title -> body inside one station

// The headline is ONE frozen string. Desktop sets it on one line, exactly as the reference
// does. Portrait breaks it after the first sentence — a HAND-PLACED break, not the browser's.
// The clauses are sliced out of the copy string and re-joined with their own punctuation and
// space, so the rendered text still reads back as S3_HOW.h2 verbatim.
const H2_CLAUSES = S3_HOW.h2.split('. ');
const H2_LINES = H2_CLAUSES.map((clause, i) => (
  i < H2_CLAUSES.length - 1 ? `${clause}. ` : clause
));

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
.s3-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: ${SP[6]}px; }
@media (max-width: 1080px) { .s3-grid { gap: ${SP[4]}px; } }
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

function StationNumber({ children, size }) {
  return (
    <div
      style={{
        fontFamily: F.display,
        fontWeight: 400,
        fontSize: size,
        lineHeight: LH.display,
        letterSpacing: LS.display,
        color: C.bronze,
      }}
    >
      {children}
    </div>
  );
}

function SectionHead({ split }) {
  return (
    <div style={{ paddingLeft: split ? SP[4] : 0 }}>
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

function DesktopSpine() {
  const { stations } = S3_HOW;
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
        {stations.map((st, i) => (
          <div key={st.n} style={{ display: 'flex' }}>
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
                <EvidenceFrame src={EVIDENCE[i]} alt={st.title} />
                {/* the drop connector belongs to the station, so it lights with it */}
                <Reveal
                  delay={i * STATION_STEP}
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

function DesktopStations() {
  const { stations } = S3_HOW;
  return (
    <div className="s3-grid" style={{ marginTop: SP[6] }}>
      {stations.map((st, i) => {
        const base = i * STATION_STEP;
        return (
          <div key={st.n}>
            <Reveal delay={base} y={10} duration={DUR.quick} threshold={0.05}>
              <StationNumber size={T.d3}>{st.n}</StationNumber>
            </Reveal>
            <Reveal
              delay={base + PART_STEP}
              y={10}
              duration={DUR.quick}
              threshold={0.05}
              style={{ marginTop: SP[4] }}
            >
              <Display as="h3" size={T.d4} style={{ color: C.onBone }}>{st.title}</Display>
            </Reveal>
            <Reveal
              delay={base + PART_STEP * 2}
              y={10}
              duration={DUR.quick}
              threshold={0.05}
              style={{ marginTop: SP[5] }}
            >
              <Body tone="bone">{st.body}</Body>
            </Reveal>
          </div>
        );
      })}
    </div>
  );
}

function MobileFlow() {
  const { stations } = S3_HOW;
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

      <SectionHead split />

      {stations.map((st, i) => {
        const base = i * MOBILE_STATION_STEP;
        return (
          <React.Fragment key={st.n}>
            <div
              style={{
                position: 'relative',
                paddingLeft: SP[7],
                marginTop: i === 0 ? SP[7] : SP[6],
                zIndex: 2,
              }}
            >
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
                <StationNumber size={T.d4}>{st.n}</StationNumber>
              </Reveal>
              <Reveal
                delay={base + PART_STEP}
                y={10}
                duration={DUR.quick}
                threshold={0.05}
                style={{ marginTop: SP[1] }}
              >
                <Display as="h3" size={T.d3} style={{ color: C.onBone, lineHeight: LH.display }}>
                  {st.title}
                </Display>
              </Reveal>
              <Reveal
                delay={base + PART_STEP * 2}
                y={10}
                duration={DUR.quick}
                threshold={0.05}
                style={{ marginTop: SP[2] }}
              >
                <Body tone="bone">{st.body}</Body>
              </Reveal>
            </div>

            {i === MOBILE_EVIDENCE_STATION ? (
              <div
                style={{
                  position: 'relative',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '100vw',
                  aspectRatio: '16 / 5',
                  marginTop: SP[4],
                  background: C.boneSoft,
                  zIndex: 1,
                }}
              >
                <img className="s3-img" src={EVIDENCE[i]} alt={st.title} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function S3HowItRuns({ onOpenBrief }) {
  const isMobile = useIsMobile();
  void onOpenBrief; // this section carries no call to action

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
            <DesktopStations />
          </React.Fragment>
        )}
      </div>
    </Section>
  );
}
