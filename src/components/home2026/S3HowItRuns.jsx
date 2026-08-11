// S3 — THE FIVE-STATION SPINE. Bone paper.
// Desktop: five stations on one horizontal bronze spine, three evidence photos
// clipped in above it. Mobile: the spine rotates vertical and the reader descends it.
import React, { useState, useEffect } from 'react';
import {
  C, F, SP, T, LS, LH, BP,
  Section, Eyebrow, Display, Body,
} from './tokens';
import { S3_HOW } from './copy';

// Evidence photographs clip into the spine above stations 01, 02 and 04.
const EVIDENCE = {
  0: '/home2026/evidence-01.jpg',
  1: '/home2026/evidence-02.jpg',
  3: '/home2026/evidence-03.jpg',
};
// The one photograph that survives the portrait re-composition, full bleed after station 02.
const MOBILE_EVIDENCE_STATION = 1;

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

function DesktopSpine() {
  const { stations } = S3_HOW;
  return (
    <div style={{ position: 'relative', marginTop: SP[8] }}>
      {/* the spine — full bleed, arrow at the right end */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          height: 1,
          background: C.bronze,
        }}
      >
        <span
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
                  maxWidth: 208,
                }}
              >
                <EvidenceFrame src={EVIDENCE[i]} alt={st.title} />
                <span
                  aria-hidden="true"
                  style={{
                    flex: 1,
                    minHeight: SP[8],
                    width: 0,
                    borderLeft: `1px dashed ${C.bronze}`,
                  }}
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
      {stations.map(st => (
        <div key={st.n}>
          <StationNumber size={T.d3}>{st.n}</StationNumber>
          <Display as="h3" size={T.d4} style={{ marginTop: SP[4], color: C.onBone }}>
            {st.title}
          </Display>
          <Body tone="bone" style={{ marginTop: SP[5] }}>{st.body}</Body>
        </div>
      ))}
    </div>
  );
}

function MobileSpine() {
  const { stations } = S3_HOW;
  return (
    <div style={{ position: 'relative', marginTop: SP[7] }}>
      {/* the spine, rotated vertical — the reader descends it */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 1,
          background: C.bronze,
          zIndex: 2,
        }}
      />
      <span
        aria-hidden="true"
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

      {stations.map((st, i) => (
        <React.Fragment key={st.n}>
          <div
            style={{
              position: 'relative',
              paddingLeft: SP[8],
              marginTop: i === 0 ? 0 : SP[6],
              zIndex: 2,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: -SP[2],
                top: 0,
                width: SP[4],
                height: SP[4],
                borderRadius: '50%',
                background: C.bronze,
              }}
            />
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                top: SP[2],
                width: SP[7],
                height: 1,
                background: C.bronze,
              }}
            />
            <StationNumber size={T.d4}>{st.n}</StationNumber>
            <Display as="h3" size={T.d4} style={{ marginTop: SP[2], color: C.onBone }}>
              {st.title}
            </Display>
            <Body tone="bone" style={{ marginTop: SP[3] }}>{st.body}</Body>
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
                marginBottom: SP[4],
                background: C.boneSoft,
                zIndex: 1,
              }}
            >
              <img className="s3-img" src={EVIDENCE[i]} alt={st.title} />
            </div>
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function S3HowItRuns({ onOpenBrief }) {
  const isMobile = useIsMobile();
  void onOpenBrief; // this section carries no call to action

  return (
    <Section tone="bone" id="how-it-runs" style={{ overflow: 'hidden' }}>
      <style>{SCOPED_CSS}</style>
      <div className="s3-root">
        <div style={{ paddingLeft: isMobile ? SP[4] : 0 }}>
          <Eyebrow tone="bone">{S3_HOW.eyebrow}</Eyebrow>
          <Display as="h2" size={T.d2} style={{ color: C.onBone, lineHeight: LH.display }}>
            {S3_HOW.h2}
          </Display>
        </div>

        {isMobile ? (
          <MobileSpine />
        ) : (
          <React.Fragment>
            <DesktopSpine />
            <DesktopStations />
          </React.Fragment>
        )}
      </div>
    </Section>
  );
}
