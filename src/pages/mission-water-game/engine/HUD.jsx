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

// Cache-bust version: bump when the Ch1 badge/frame PNGs are re-processed so
// browsers + CDN refetch instead of serving stale opaque (checkerboard) bytes.
const ASSET_V = '?v=2';

const BADGE_ART = {
  // Chapter 1
  groundwater_hydrology: '/mission-water/chapter-1/badges/badge_groundwater_hydrology.png' + ASSET_V,
  environmental_chemistry: '/mission-water/chapter-1/badges/badge_environmental_chemistry.png' + ASSET_V,
  climate_science: '/mission-water/chapter-1/badges/badge_climate_science.png' + ASSET_V,
  water_security: '/mission-water/chapter-1/badges/badge_water_security.png' + ASSET_V,
  mission_imperative: '/mission-water/chapter-1/badges/badge_mission_imperative.png' + ASSET_V,
  pete_conrad_legacy: '/mission-water/chapter-1/badges/badge_pete_conrad_legacy.png' + ASSET_V,
  // Chapter 2
  badge_ch2_space_hydrology: '/mission-water/chapter-2/badges/badge_ch2_space_hydrology.png',
  badge_ch2_life_support: '/mission-water/chapter-2/badges/badge_ch2_life_support.png',
  badge_ch2_orbital_mechanics: '/mission-water/chapter-2/badges/badge_ch2_orbital_mechanics.png',
  badge_ch2_lunar_water_theory: '/mission-water/chapter-2/badges/badge_ch2_lunar_water_theory.png',
};

const DISCOVERY_LABELS = {
  // Chapter 1
  groundwater_hydrology: 'GROUNDWATER HYDROLOGY',
  environmental_chemistry: 'ENVIRONMENTAL CHEMISTRY',
  climate_science: 'CLIMATE SCIENCE',
  water_security: 'WATER SECURITY',
  mission_imperative: 'MISSION IMPERATIVE',
  pete_conrad_legacy: 'PETE CONRAD LEGACY',
  social_impact: 'SOCIAL IMPACT',
  public_health: 'PUBLIC HEALTH',
  food_water_nexus: 'FOOD–WATER NEXUS',
  lunar_water_connection: 'LUNAR WATER CONNECTION',
  // Chapter 2
  badge_ch2_space_hydrology: 'SPACE HYDROLOGY',
  badge_ch2_life_support: 'LIFE SUPPORT SYSTEMS',
  badge_ch2_orbital_mechanics: 'ORBITAL MECHANICS',
  badge_ch2_lunar_water_theory: 'LUNAR WATER THEORY',
};

const BADGE_FRAME = '/mission-water/chapter-1/hud/hud_badge_frame.png' + ASSET_V;

export default function HUD({ phase, hud, onChoose }) {
  const [focusIdx, setFocusIdx] = useState(0);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const btnsRef = useRef([]);
  const choices = (phase && phase.choices) || [];

  useEffect(() => {
    setFocusIdx(0);
    setHoverIdx(-1);
    const t = setTimeout(() => {
      if (btnsRef.current[0]) btnsRef.current[0].focus();
    }, 50);
    return () => clearTimeout(t);
  }, [phase && phase.id]);

  useEffect(() => {
    if (choices.length === 0) return undefined;
    const onKey = (e) => {
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
      {/* ── TOP INSTRUMENT BAR ──────────────────────────────────── */}
      <div style={styles.topBar}>
        <MissionIdent chapter={phase.chapter} />
        <InstrumentRow hud={hud} chapter={phase.chapter} />
        <BadgeRack ids={hud.discovery_ids || []} />
      </div>

      {/* ── COUNCIL AWARD CEREMONY ──────────────────────────────── */}
      {isCouncil && (hud.discovery_ids || []).length > 0 && (
        <FramedAwards ids={hud.discovery_ids} />
      )}

      {/* ── MISSION DEBRIEF + CHOICES ───────────────────────────── */}
      <div style={styles.bottom}>
        <div style={styles.debriefCard}>
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
                    {isSelected && <span style={styles.choiceConfirm}>CONFIRM</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={styles.terminal}>■ END OF CHAPTER — NEXT PHASE INCOMING</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── subcomponents ────────────────────────────────────────────────────────────

function MissionIdent({ chapter }) {
  const n = String(chapter || 1).padStart(2, '0');
  return (
    <div style={styles.missionIdent}>
      <div style={styles.identBadge}>
        <div style={styles.identTopLine}>MISSION WATER</div>
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
    padding: '0 24px 24px',
  },
  debriefCard: {
    background: 'rgba(7,11,20,0.88)',
    border: `1px solid rgba(0,229,204,0.22)`,
    borderRadius: 0,
    padding: '18px 22px 18px',
    maxWidth: 780,
    margin: '0 auto',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 0 28px rgba(0,229,204,0.06), inset 0 0 24px rgba(0,229,204,0.03)',
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
    fontSize: 19,
    fontWeight: 500,
    lineHeight: 1.45,
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
    padding: '10px 16px',
    borderRadius: 4,
    border: `1.5px solid #1A2A4A`,
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
  // HOVER — mission cyan border + subtle glow
  choiceBtnHover: {
    border: `1.5px solid #1A90FF`,
    background: `linear-gradient(180deg, rgba(26,144,255,0.15) 0%, rgba(10,60,140,0.15) 100%)`,
    boxShadow: `0 0 14px rgba(26,144,255,0.3), inset 0 0 10px rgba(26,144,255,0.08)`,
    color: WHITE,
  },
  // SELECTED — mission cyan border + strong glow
  choiceBtnSelected: {
    border: `1.5px solid ${CYAN}`,
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
};
