import React, { useEffect, useRef, useState } from 'react';

/**
 * HUD — Mission Water Game instrument panel overlay.
 *
 * R2-REVISED: Full NASA space game aesthetic redesign.
 *   - Orbitron font for all HUD labels, chapter identifiers, stat readouts
 *   - Rajdhani font for narrative text and choice buttons
 *   - #070B14 deep space background, #00E5CC mission cyan, #FFB703 amber alerts
 *   - Instrument panel stat cards with scanline texture + CRT glow
 *   - Hardware-style choice buttons (squared, uppercase, letter-spaced)
 *   - Circular NASA mission-patch badge frames
 *   - Phase titles: ALL CAPS, cyan accent line above
 *
 * Layout:
 *   Top-left:   Mission chapter identifier (MISSION — CH 01)
 *   Top-center: Instrument stat panels (H2O LEVEL / INVESTIGATION / DISCOVERIES)
 *   Top-right:  Earned discovery badges (circular mission-patch style)
 *   Bottom:     Narrative debrief card + hardware control buttons
 *   Council:    Framed award ceremony moment
 */

import { BADGE_ART, DISCOVERY_LABELS, BADGE_FRAME } from './badges.js';
import { SUPPLY_DEFS } from './PhaseManager.js';

/**
 * HUD also accepts:
 *   resources  {Object|null}  investigationResources from game state
 *
 * R18b: the Mission Kit overlay moved into the persistent ManifestDrawer
 * (every screen). The HUD gained a compact SUPPLIES readout in the top bar —
 * food/power/parts/tools at a glance, with a LOW SUPPLIES warning state.
 */
export default function HUD({ phase, hud, onChoose, resources, playerName, missionLabel = 'MISSION WATER' }) {
  const [focusIdx, setFocusIdx] = useState(0);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const btnsRef = useRef([]);
  const choices = (phase && phase.choices) || [];

  // Active resources: prefer hud-injected, fall back to prop
  const activeResources = (hud && hud.investigationResources) || resources || null;

  useEffect(() => {
    setFocusIdx(0);
    setHoverIdx(-1);
    const t = setTimeout(() => {
      if (btnsRef.current[0]) btnsRef.current[0].focus();
    }, 50);
    return () => clearTimeout(t);
  }, [phase && phase.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (choices.length === 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusIdx((i) => {
          const ni = (i + 1) % choices.length;
          if (btnsRef.current[ni]) btnsRef.current[ni].focus();
          return ni;
        });
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusIdx((i) => {
          const ni = (i - 1 + choices.length) % choices.length;
          if (btnsRef.current[ni]) btnsRef.current[ni].focus();
          return ni;
        });
      } else if (e.key === 'Enter') {
        if (document.activeElement && document.activeElement.tagName !== 'BUTTON') {
          e.preventDefault();
          const choice = choices[focusIdx];
          if (choice) onChoose(choice.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choices, focusIdx, onChoose]);

  if (!phase) return null;

  const isCouncil = (
    phase.id === 'ch1_council_reveal' ||
    phase.id === 'ch1_end' ||
    phase.id === 'ch2_chapter_reveal'
  );

  return (
    <div style={styles.root}>
      {/* ── R18a sequencing ─────────────────────────────────────── */}
      <style>{`
        /* Debrief card lands AFTER the background image has breathed in */
        @keyframes hud-card-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hud-debrief { animation: hud-card-in 500ms ease 750ms both; }
        @media (prefers-reduced-motion: reduce) {
          .hud-debrief { animation: none; }
        }
      `}</style>

      {/* ── TOP INSTRUMENT BAR ──────────────────────────────────── */}
      <div style={styles.topBar}>
        <MissionIdent chapter={phase.chapter} playerName={playerName} missionLabel={missionLabel} />
        <InstrumentRow hud={hud} chapter={phase.chapter} />
        <div style={styles.topBarRight}>
          {/* R18b — survival supplies at a glance (full detail in MANIFEST) */}
          {hud.supplies && (
            <SuppliesMini supplies={hud.supplies} weakened={!!hud.weakened} />
          )}
          <BadgeRack ids={hud.discovery_ids || []} />
        </div>
      </div>

      {/* ── COUNCIL AWARD CEREMONY ──────────────────────────────── */}
      {isCouncil && (hud.discovery_ids || []).length > 0 && (
        <FramedAwards ids={hud.discovery_ids} />
      )}

      {/* ── MISSION DEBRIEF + CHOICES ───────────────────────────── */}
      <div style={styles.bottom}>
        <div className="hud-debrief" key={phase.id} style={styles.debriefCard}>
          {phase.title && (
            <div style={styles.objectiveHeader}>
              <div style={styles.objectiveAccentLine} />
              <div style={styles.objectiveKicker}>
                {hud.region ? `${hud.region.toUpperCase()} SECTOR · ` : 'MISSION OBJECTIVE · '}
                {phase.title.toUpperCase()}
              </div>
            </div>
          )}
          <p style={styles.narrative}>{phase.narrative}</p>
          {choices.length > 0 ? (
            <div style={styles.choices}>
              {choices.map((c, idx) => {
                const isSelected = focusIdx === idx;
                const isHover = hoverIdx === idx && !isSelected;
                // Resource cost + LOW indicator
                const cost = c.resource_cost;
                const costType = cost?.type;
                const costAmt = cost?.amount ?? 0;
                const currentRes = costType && activeResources ? (activeResources[costType] ?? 0) : Infinity;
                const isLow = costType && currentRes < costAmt;
                return (
                  <button
                    key={c.id}
                    ref={(el) => (btnsRef.current[idx] = el)}
                    onClick={() => onChoose(c.id)}
                    onFocus={() => setFocusIdx(idx)}
                    onMouseEnter={() => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx(-1)}
                    style={{
                      ...styles.choiceBtn,
                      ...(isHover ? styles.choiceBtnHover : null),
                      ...(isSelected ? styles.choiceBtnSelected : null),
                    }}
                  >
                    <span style={{
                      ...styles.choiceIndicator,
                      ...(isSelected ? styles.choiceIndicatorSelected : null),
                    }}>
                      {isSelected ? '▶' : '○'}
                    </span>
                    <span style={{
                      ...styles.choiceText,
                      ...(isSelected ? styles.choiceTextSelected : null),
                      ...(isHover ? styles.choiceTextHover : null),
                    }}>
                      {c.text.toUpperCase()}
                    </span>
                    {/* Resource cost badge */}
                    {cost && (
                      <span style={{
                        ...styles.costBadge,
                        color: isLow ? '#FF4C4C' : AMBER,
                        borderColor: isLow ? 'rgba(255,76,76,0.5)' : 'rgba(255,183,3,0.4)',
                      }}>
                        {isLow ? 'LOW' : `−${costAmt}`}
                      </span>
                    )}
                    {isSelected && !cost && <span style={styles.choiceConfirm}>CONFIRM</span>}
                    {isSelected && cost && <span style={styles.choiceConfirm}>CONFIRM</span>}
                  </button>
                );
              })}
            </div>
          ) : (
 <div style={styles.terminal}>■ END OF CHAPTER, NEXT PHASE INCOMING</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── subcomponents ────────────────────────────────────────────────────────────

function MissionIdent({ chapter, playerName, missionLabel = 'MISSION WATER' }) {
  const n = String(chapter || 1).padStart(2, '0');
  return (
    <div style={styles.missionIdent}>
      <div style={styles.identBadge}>
        <div style={styles.identTopLine}>{missionLabel}</div>
        {playerName ? (
          <div style={styles.identCadet}>CADET: {playerName}</div>
        ) : null}
        <div style={styles.identChapter}>CH {n}</div>
        <div style={styles.identStatus}>
          <span style={styles.statusDot} />
          ACTIVE
        </div>
      </div>
    </div>
  );
}

function InstrumentRow({ hud, chapter }) {
  if (!hud) return null;

  // Chapter 2 — space mission instruments
  if (chapter === 2) {
    return (
      <div style={styles.instrumentRow}>
        <InstrumentPanel
          label="WATER RES"
          value={hud.water_res}
          suffix="%"
          icon={<WaterIcon />}
          dangerBelow={30}
          warningBelow={60}
        />
        <InstrumentPanel
          label="O2 LEVEL"
          value={hud.o2}
          suffix="%"
          icon={<OxygenIcon />}
          dangerBelow={40}
          warningBelow={70}
        />
        <InstrumentPanel
          label="DIST TO LZ"
          value={hud.dist}
          suffix="%"
          icon={<DistanceIcon />}
        />
        <InstrumentPanel
          label="HULL INT"
          value={hud.hull}
          suffix="%"
          icon={<HullIcon />}
          dangerBelow={50}
          warningBelow={75}
        />
      </div>
    );
  }

  // Chapter 1 (default) — Earth investigation instruments
  return (
    <div style={styles.instrumentRow}>
      <InstrumentPanel
        label="H2O LEVEL"
        value={hud.water_crisis}
        suffix="%"
        icon={<WaterIcon />}
        dangerBelow={30}
        warningBelow={60}
      />
      <InstrumentPanel
        label="INVESTIGATION"
        value={hud.investigation_progress}
        suffix="%"
        icon={<ScanIcon />}
      />
      <InstrumentPanel
        label="DISCOVERIES"
        value={Math.min(100, ((hud.discoveries || 0) / 3) * 100)}
        displayValue={hud.discoveries || 0}
        suffix=""
        icon={<BadgeSystemIcon />}
        rawDisplay
      />
    </div>
  );
}

function InstrumentPanel({ label, value, suffix = '%', displayValue, icon, dangerBelow, warningBelow, rawDisplay }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const shown = displayValue != null ? displayValue : Math.round(pct);
  const isDanger = dangerBelow != null && pct < dangerBelow;
  const isWarning = warningBelow != null && pct < warningBelow && !isDanger;
  const barColor = isDanger ? '#FF4444' : isWarning ? '#FFB703' : CYAN;
  const barGlow = isDanger
    ? '0 0 10px rgba(255,68,68,0.6)'
    : isWarning
    ? '0 0 10px rgba(255,183,3,0.6)'
    : `0 0 10px rgba(0,229,204,0.5)`;

  return (
    <div style={{
      ...styles.instrPanel,
      borderColor: isDanger ? 'rgba(255,68,68,0.6)' : isWarning ? 'rgba(255,183,3,0.6)' : 'rgba(0,229,204,0.35)',
      boxShadow: isDanger
        ? '0 0 16px rgba(255,68,68,0.2), inset 0 0 20px rgba(255,68,68,0.04)'
        : isWarning
        ? '0 0 16px rgba(255,183,3,0.2), inset 0 0 20px rgba(255,183,3,0.04)'
        : '0 0 16px rgba(0,229,204,0.1), inset 0 0 20px rgba(0,229,204,0.04)',
    }}>
      {/* Scanline overlay (pure CSS) */}
      <div style={styles.scanlineOverlay} />
      <div style={styles.instrIconBox}>{icon}</div>
      <div style={styles.instrBody}>
        <div style={styles.instrLabel}>{label}</div>
        <div style={styles.instrBarTrack}>
          <div style={{
            ...styles.instrBarFill,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}88 0%, ${barColor} 100%)`,
            boxShadow: barGlow,
          }} />
        </div>
        <div style={{
          ...styles.instrReadout,
          color: isDanger ? '#FF4444' : isWarning ? '#FFB703' : CYAN,
          textShadow: isDanger ? '0 0 8px rgba(255,68,68,0.8)' : isWarning ? '0 0 8px rgba(255,183,3,0.8)' : `0 0 8px rgba(0,229,204,0.8)`,
        }}>
          {rawDisplay ? `${shown} / 3` : `${shown}${suffix}`}
        </div>
      </div>
    </div>
  );
}

function BadgeRack({ ids }) {
  return (
    <div style={styles.badgeRack}>
      {ids.length === 0 ? (
        <div style={styles.badgeRackEmpty}>
          <span style={styles.badgeEmptyLine}>NO BADGES</span>
          <span style={styles.badgeEmptyLine}>ACQUIRED</span>
        </div>
      ) : (
        ids.map((id) => {
          const art = BADGE_ART[id];
          const label = DISCOVERY_LABELS[id] || id;
          return (
            <div key={id} style={styles.badgePatch} title={label}>
              {/* Outer ring — mission patch border */}
              <div style={styles.badgePatchRing}>
                {/* Inner glow ring */}
                <div style={styles.badgePatchInner}>
                  {art ? (
                    <img src={art} alt={label} style={styles.badgePatchImg} />
                  ) : (
                    <div style={styles.badgePatchText}>{label.slice(0, 2)}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function FramedAwards({ ids }) {
  const awarded = ids.filter((id) => BADGE_ART[id]);
  if (awarded.length === 0) return null;
  return (
    <div style={styles.awardCeremony}>
      <div style={styles.awardCeremonyPanel}>
        {/* Scanline overlay on the ceremony panel */}
        <div style={styles.scanlineOverlay} />

        {/* Header */}
        <div style={styles.awardCeremonyHeader}>
          <div style={styles.awardCeremonyAccentLine} />
          <div style={styles.awardCeremonyTitle}>MISSION COMPLETE</div>
          <div style={styles.awardCeremonySub}>DISCOVERIES AWARDED · CHAPTER DEBRIEF</div>
        </div>

        {/* Badge row */}
        <div style={styles.awardRow}>
          {awarded.map((id) => (
            <div key={id} style={styles.awardSlot}>
              <div style={styles.awardGlow} />
              <img src={BADGE_FRAME} alt="" style={styles.awardFrame} />
              <img src={BADGE_ART[id]} alt="" style={styles.awardBadge} />
              <div style={styles.awardLabel}>{DISCOVERY_LABELS[id] || id}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={styles.awardCeremonyFooter}>
          <div style={styles.awardFooterLine} />
          <div>YOUR FIELD DISCOVERIES HAVE BEEN LOGGED TO THE MISSION RECORD</div>
        </div>
      </div>
    </div>
  );
}

// ─── SuppliesMini (R18b) — compact survival readout, top-right ───────────────

function supplyMiniColor(v) {
  if (v <= 0) return '#FF4444';
  if (v <= 2) return AMBER;
  return CYAN;
}

function SuppliesMini({ supplies, weakened }) {
  return (
    <div style={{
      ...styles.suppliesMini,
      borderColor: weakened ? 'rgba(255,68,68,0.6)' : 'rgba(0,229,204,0.35)',
      boxShadow: weakened
        ? '0 0 14px rgba(255,68,68,0.25)'
        : '0 0 10px rgba(0,229,204,0.1)',
    }}>
      <div style={styles.scanlineOverlay} />
      {SUPPLY_DEFS.map(({ key, short }) => {
        const val = Math.max(0, supplies[key] ?? 0);
        const color = supplyMiniColor(val);
        return (
          <div key={key} style={styles.suppliesMiniCell}>
            <div style={styles.suppliesMiniLabel}>{short}</div>
            <div style={{
              ...styles.suppliesMiniValue,
              color,
              textShadow: `0 0 6px ${color}90`,
            }}>
              {val}
            </div>
          </div>
        );
      })}
      {weakened && <div style={styles.suppliesMiniWarn}>LOW</div>}
    </div>
  );
}

// ─── inline SVG icons ─────────────────────────────────────────────────────────

function WaterIcon() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden>
      <path
        d="M16 4 C22 12 27 18 27 23 A11 11 0 0 1 5 23 C5 18 10 12 16 4Z"
        fill="none"
        stroke={CYAN}
        strokeWidth="1.5"
      />
      <path
        d="M16 8 C20 14 23 18 23 22 A7 7 0 0 1 9 22 C9 18 12 14 16 8Z"
        fill={CYAN}
        opacity="0.25"
      />
      <line x1="10" y1="22" x2="22" y2="22" stroke={CYAN} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden>
      <rect x="6" y="6" width="20" height="20" rx="2" fill="none" stroke={CYAN} strokeWidth="1.5" />
      <circle cx="16" cy="16" r="5" fill="none" stroke={CYAN} strokeWidth="1.2" />
      <line x1="16" y1="6" x2="16" y2="10" stroke={CYAN} strokeWidth="1.5" />
      <line x1="16" y1="22" x2="16" y2="26" stroke={CYAN} strokeWidth="1.5" />
      <line x1="6" y1="16" x2="10" y2="16" stroke={CYAN} strokeWidth="1.5" />
      <line x1="22" y1="16" x2="26" y2="16" stroke={CYAN} strokeWidth="1.5" />
      <rect x="14" y="14" width="4" height="4" fill={CYAN} opacity="0.4" />
    </svg>
  );
}

function BadgeSystemIcon() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden>
      <polygon
        points="16,4 28,10 28,22 16,28 4,22 4,10"
        fill="none"
        stroke={CYAN}
        strokeWidth="1.5"
      />
      <polygon
        points="16,10 21,13 21,19 16,22 11,19 11,13"
        fill={CYAN}
        opacity="0.2"
        stroke={CYAN}
        strokeWidth="0.8"
      />
      <circle cx="16" cy="16" r="2.5" fill={CYAN} opacity="0.7" />
    </svg>
  );
}

// Chapter 2 icons
function OxygenIcon() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden>
      <circle cx="16" cy="16" r="11" fill="none" stroke={CYAN} strokeWidth="1.5" />
      <circle cx="16" cy="16" r="7" fill={CYAN} opacity="0.12" />
      <text x="16" y="20.5" textAnchor="middle" fontFamily="monospace" fontSize="10" fontWeight="700" fill={CYAN}>O₂</text>
    </svg>
  );
}

function DistanceIcon() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden>
      <line x1="4" y1="16" x2="28" y2="16" stroke={CYAN} strokeWidth="1.5" />
      <polygon points="22,10 28,16 22,22" fill={CYAN} opacity="0.8" />
      <circle cx="6" cy="16" r="2.5" fill={CYAN} opacity="0.6" />
      <line x1="10" y1="12" x2="10" y2="20" stroke={CYAN} strokeWidth="1" opacity="0.4" />
      <line x1="16" y1="12" x2="16" y2="20" stroke={CYAN} strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function HullIcon() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden>
      <path
        d="M16 4 L26 10 L26 22 L16 28 L6 22 L6 10 Z"
        fill="none"
        stroke={CYAN}
        strokeWidth="1.5"
      />
      <path
        d="M16 8 L22 12 L22 20 L16 24 L10 20 L10 12 Z"
        fill={CYAN}
        opacity="0.15"
      />
      <line x1="16" y1="4" x2="16" y2="8" stroke={CYAN} strokeWidth="2" />
      <line x1="26" y1="10" x2="22" y2="12" stroke={CYAN} strokeWidth="1" opacity="0.6" />
      <line x1="6" y1="10" x2="10" y2="12" stroke={CYAN} strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

// ─── color constants ──────────────────────────────────────────────────────────

const CYAN = '#00E5CC';
const AMBER = '#FFB703';
const SPACE_DARK = '#070B14';
const PANEL_BG = '#0A1628';
const WHITE = '#FFFFFF';
const TEXT_SOFT = '#C8D8F0';

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
    color: WHITE,
  },

  // ── top instrument bar ────
  topBar: {
    pointerEvents: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: '16px 20px',
    background:
      'linear-gradient(to bottom, rgba(7,11,20,0.88) 0%, rgba(7,11,20,0) 100%)',
  },

  // ── mission ident (top-left) ────
  missionIdent: {
    flexShrink: 0,
  },
  identBadge: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '8px 14px',
    background: 'rgba(10,22,40,0.85)',
    border: `1px solid rgba(0,229,204,0.4)`,
    boxShadow: `0 0 12px rgba(0,229,204,0.15), inset 0 0 12px rgba(0,229,204,0.05)`,
    position: 'relative',
    overflow: 'hidden',
  },
  identTopLine: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: '0.3em',
    color: CYAN,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  identCadet: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: '0.22em',
    color: CYAN,
    textTransform: 'uppercase',
    opacity: 0.9,
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 120,
  },
  identChapter: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '0.08em',
    color: WHITE,
    lineHeight: 1,
  },
  identStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: '"Orbitron", monospace',
    fontSize: 7,
    fontWeight: 500,
    letterSpacing: '0.25em',
    color: CYAN,
    marginTop: 2,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: CYAN,
    boxShadow: `0 0 6px ${CYAN}`,
    animation: 'none',
  },

  // ── instrument panels (top-center) ────
  instrumentRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    flex: 1,
    flexWrap: 'wrap',
  },
  instrPanel: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    width: 190,
    minWidth: 160,
    background: `linear-gradient(135deg, rgba(10,22,40,0.92) 0%, rgba(7,14,28,0.92) 100%)`,
    border: `1px solid rgba(0,229,204,0.35)`,
    borderRadius: 0,
    overflow: 'hidden',
  },
  // CSS scanline overlay — pure CSS, no image
  scanlineOverlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px)',
    zIndex: 1,
  },
  instrIconBox: {
    width: 32,
    height: 32,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,12,25,0.9)',
    border: `1px solid rgba(0,229,204,0.3)`,
    position: 'relative',
    zIndex: 2,
  },
  instrBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
    position: 'relative',
    zIndex: 2,
  },
  instrLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: '0.22em',
    color: 'rgba(200,216,240,0.7)',
    textTransform: 'uppercase',
  },
  instrBarTrack: {
    height: 8,
    background: 'rgba(0,0,0,0.7)',
    border: `1px solid rgba(0,229,204,0.2)`,
    overflow: 'hidden',
    position: 'relative',
  },
  instrBarFill: {
    height: '100%',
    transition: 'width 400ms cubic-bezier(.2,.8,.2,1)',
  },
  instrReadout: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.06em',
    lineHeight: 1,
    color: CYAN,
    textAlign: 'right',
  },

  // ── badge rack (top-right) ────
  badgeRack: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: 180,
    flexShrink: 0,
    alignItems: 'flex-start',
  },
  badgeRackEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
    padding: '6px 0',
  },
  badgeEmptyLine: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 7,
    letterSpacing: '0.2em',
    color: 'rgba(200,216,240,0.3)',
  },
  badgePatch: {
    width: 52,
    height: 52,
    flexShrink: 0,
  },
  badgePatchRing: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: `conic-gradient(${AMBER} 0deg, #A07800 60deg, ${AMBER} 120deg, #A07800 180deg, ${AMBER} 240deg, #A07800 300deg, ${AMBER} 360deg)`,
    padding: 3,
    boxShadow: `0 0 14px rgba(255,183,3,0.45), inset 0 0 8px rgba(0,0,0,0.6)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePatchInner: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: `rgba(7,11,20,0.95)`,
    border: `1px solid rgba(0,229,204,0.3)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: `inset 0 0 10px rgba(0,229,204,0.15)`,
  },
  badgePatchImg: {
    width: '90%',
    height: '90%',
    objectFit: 'contain',
    borderRadius: '50%',
  },
  badgePatchText: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    fontWeight: 700,
    color: CYAN,
    textAlign: 'center',
    letterSpacing: '0.05em',
  },

  // ── council framed award ceremony ────
  awardRow: {
    pointerEvents: 'none',
    display: 'flex',
    justifyContent: 'center',
    gap: 24,
    padding: '0 24px',
    marginTop: -16,
  },
  awardSlot: {
    position: 'relative',
    width: 168,
    height: 188,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  awardGlow: {
    position: 'absolute',
    inset: -12,
    borderRadius: '50%',
    background: `radial-gradient(circle, rgba(255,183,3,0.25) 0%, transparent 70%)`,
    pointerEvents: 'none',
  },
  awardFrame: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  awardBadge: {
    position: 'absolute',
    top: '18%',
    left: '20%',
    width: '60%',
    height: '60%',
    objectFit: 'contain',
    borderRadius: '50%',
  },
  awardLabel: {
    position: 'absolute',
    bottom: '6%',
    left: '10%',
    right: '10%',
    textAlign: 'center',
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: '0.15em',
    color: AMBER,
    textTransform: 'uppercase',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
  },

  // ── bottom debrief card ────
  bottom: {
    pointerEvents: 'auto',
    padding: '0 32px 28px',
  },
  debriefCard: {
    background: 'rgba(7,11,20,0.93)',
    border: `1px solid rgba(0,229,204,0.30)`,
    borderTop: `2px solid rgba(0,229,204,0.55)`,
    borderRadius: 0,
    padding: '22px 28px 22px',
    maxWidth: 860,
    margin: '0 auto',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 0 40px rgba(0,229,204,0.10), 0 -4px 24px rgba(0,229,204,0.05), inset 0 0 30px rgba(0,229,204,0.04)',
    position: 'relative',
    overflow: 'hidden',
  },

  // Phase title — ALL CAPS, cyan accent line above
  objectiveHeader: {
    marginBottom: 10,
  },
  objectiveAccentLine: {
    height: 2,
    width: 36,
    background: CYAN,
    boxShadow: `0 0 8px ${CYAN}`,
    marginBottom: 6,
  },
  objectiveKicker: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.2em',
    color: CYAN,
    textTransform: 'uppercase',
    textShadow: `0 0 8px rgba(0,229,204,0.5)`,
  },

  // Narrative text — Rajdhani, debrief style
  narrative: {
    fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
    fontSize: 21,
    fontWeight: 500,
    lineHeight: 1.7,
    letterSpacing: '0.01em',
    margin: 0,
    color: TEXT_SOFT,
  },

  // ── choice buttons — hardware control panel style ────
  choices: {
    marginTop: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  // NORMAL — dark panel interior, squared border, cool text
  choiceBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '14px 16px',
    borderRadius: 4,
    border: `1.5px solid #1A2A4A`,
    borderLeft: `3px solid transparent`,
    background: `linear-gradient(180deg, rgba(26,42,74,0.85) 0%, rgba(10,18,40,0.85) 100%)`,
    color: TEXT_SOFT,
    fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    textAlign: 'left',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
    transition: 'all 120ms ease',
    position: 'relative',
  },
  // HOVER — cyan left border + subtle glow
  choiceBtnHover: {
    border: `1.5px solid #1A90FF`,
    borderLeft: `3px solid ${CYAN}`,
    background: `linear-gradient(180deg, rgba(26,144,255,0.15) 0%, rgba(10,60,140,0.15) 100%)`,
    boxShadow: `0 0 14px rgba(26,144,255,0.3), inset 0 0 10px rgba(26,144,255,0.08)`,
    color: WHITE,
  },
  // SELECTED — cyan left border + strong glow
  choiceBtnSelected: {
    border: `1.5px solid ${CYAN}`,
    borderLeft: `3px solid ${CYAN}`,
    background: `linear-gradient(180deg, rgba(0,229,204,0.12) 0%, rgba(0,100,90,0.12) 100%)`,
    boxShadow: `0 0 20px rgba(0,229,204,0.35), inset 0 0 14px rgba(0,229,204,0.08)`,
    color: WHITE,
  },
  choiceIndicator: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    color: 'rgba(200,216,240,0.5)',
    flexShrink: 0,
    width: 14,
    textAlign: 'center',
  },
  choiceIndicatorSelected: {
    color: CYAN,
    textShadow: `0 0 6px ${CYAN}`,
  },
  choiceText: {
    flex: 1,
    color: TEXT_SOFT,
  },
  choiceTextHover: {
    color: WHITE,
  },
  choiceTextSelected: {
    color: WHITE,
    textShadow: `0 0 8px rgba(0,229,204,0.4)`,
  },
  choiceConfirm: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: CYAN,
    textShadow: `0 0 6px ${CYAN}`,
    flexShrink: 0,
    border: `1px solid rgba(0,229,204,0.4)`,
    padding: '2px 6px',
  },

  terminal: {
    marginTop: 14,
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.18em',
    color: 'rgba(200,216,240,0.45)',
    textTransform: 'uppercase',
  },

  // ── top-right container (supplies mini + badge rack) ────
  // paddingTop clears the global ◫ MANIFEST tab fixed at the viewport top-right.
  topBarRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    flexShrink: 0,
    paddingTop: 36,
  },

  // ── R18b supplies mini readout ────
  suppliesMini: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: '6px 8px',
    background: 'linear-gradient(135deg, rgba(10,22,40,0.92) 0%, rgba(7,14,28,0.92) 100%)',
    border: '1px solid',
    borderRadius: 0,
    overflow: 'hidden',
  },
  suppliesMiniCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '0 7px',
    position: 'relative',
    zIndex: 2,
  },
  suppliesMiniLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 6,
    fontWeight: 600,
    letterSpacing: '0.18em',
    color: 'rgba(200,216,240,0.6)',
    textTransform: 'uppercase',
  },
  suppliesMiniValue: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1,
  },
  suppliesMiniWarn: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: '0.15em',
    color: '#FF4444',
    border: '1px solid rgba(255,68,68,0.5)',
    borderRadius: 2,
    padding: '2px 5px',
    marginLeft: 4,
    position: 'relative',
    zIndex: 2,
  },

  // ── resource cost badge on choice buttons ────
  costBadge: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: '0.15em',
    padding: '2px 6px',
    border: '1px solid',
    borderRadius: 2,
    flexShrink: 0,
  },

  // ── kit button ────
  kitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    background: 'rgba(10,22,40,0.85)',
    border: '1px solid rgba(0,229,204,0.35)',
    borderRadius: 3,
    color: '#00E5CC',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 0 8px rgba(0,229,204,0.12)',
    transition: 'all 150ms ease',
  },
  kitBtnLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: '#00E5CC',
    textTransform: 'uppercase',
  },

  // ── mission kit overlay ────
  kitOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
  },
  kitBackdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    cursor: 'pointer',
  },
  kitPanel: {
    position: 'relative',
    zIndex: 1,
    background: 'linear-gradient(160deg, rgba(10,22,40,0.97) 0%, rgba(7,11,20,0.97) 100%)',
    border: '1px solid rgba(0,229,204,0.3)',
    borderRadius: 4,
    padding: '24px 28px',
    width: '100%',
    maxWidth: 560,
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 0 40px rgba(0,229,204,0.12), inset 0 0 30px rgba(0,229,204,0.04)',
    overflow: 'hidden',
  },
  kitScanlines: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 3px)',
    zIndex: 0,
  },
  kitHeader: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 20,
    paddingRight: 32,
  },
  kitAccentLine: {
    height: 2,
    width: 40,
    background: '#00E5CC',
    boxShadow: '0 0 8px #00E5CC',
    marginBottom: 8,
  },
  kitTitle: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  kitSub: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: '0.25em',
    color: 'rgba(0,229,204,0.6)',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  kitCloseBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    background: 'transparent',
    border: '1px solid rgba(0,229,204,0.3)',
    borderRadius: 2,
    color: 'rgba(200,216,240,0.7)',
    cursor: 'pointer',
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    outline: 'none',
    transition: 'all 150ms ease',
  },
  kitSection: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 20,
  },
  kitSectionLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: '0.25em',
    color: 'rgba(200,216,240,0.5)',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(0,229,204,0.15)',
    paddingBottom: 6,
    marginBottom: 12,
  },
  kitResList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  kitResRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  kitResLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    letterSpacing: '0.18em',
    color: 'rgba(200,216,240,0.7)',
    textTransform: 'uppercase',
    width: 110,
    flexShrink: 0,
  },
  kitResPips: {
    display: 'flex',
    gap: 4,
    flex: 1,
  },
  kitResPip: {
    width: 18,
    height: 18,
    borderRadius: 3,
    transition: 'background 200ms ease, box-shadow 200ms ease',
  },
  kitResVal: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.06em',
    flexShrink: 0,
    width: 36,
    textAlign: 'right',
  },
  kitResMax: {
    fontSize: 9,
    opacity: 0.5,
  },
  kitBadgeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
    gap: 12,
  },
  kitBadgeSlot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    transition: 'opacity 200ms ease',
  },
  kitBadgeRing: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'conic-gradient(#FFB703 0deg, #A07800 60deg, #FFB703 120deg, #A07800 180deg, #FFB703 240deg, #A07800 300deg, #FFB703 360deg)',
    padding: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kitBadgeImg: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    objectFit: 'cover',
    background: 'rgba(7,11,20,0.95)',
  },
  kitBadgeLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 6,
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: 'rgba(200,216,240,0.6)',
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 1.3,
    maxWidth: 72,
    wordBreak: 'break-word',
  },

  // ── Award ceremony overlay (Fix D) ────
  awardCeremony: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    background: 'rgba(7,11,20,0.75)',
  },
  awardCeremonyPanel: {
    position: 'relative',
    background: 'rgba(7,11,20,0.92)',
    border: `2px solid ${CYAN}`,
    boxShadow: `0 0 40px rgba(0,229,204,0.20), inset 0 0 60px rgba(0,229,204,0.04)`,
    borderRadius: 4,
    padding: '32px 40px',
    maxWidth: 680,
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    alignItems: 'center',
  },
  awardCeremonyHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  awardCeremonyAccentLine: {
    width: 60,
    height: 2,
    background: CYAN,
    boxShadow: `0 0 8px ${CYAN}`,
  },
  awardCeremonyTitle: {
    fontFamily: '"Orbitron", monospace',
    fontWeight: 700,
    fontSize: 28,
    letterSpacing: '0.12em',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    textShadow: `0 0 20px rgba(0,229,204,0.4)`,
  },
  awardCeremonySub: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    letterSpacing: '0.3em',
    color: CYAN,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  awardCeremonyFooter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    letterSpacing: '0.25em',
    color: 'rgba(0,229,204,0.5)',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  awardFooterLine: {
    width: 120,
    height: 1,
    background: 'rgba(0,229,204,0.3)',
  },
};