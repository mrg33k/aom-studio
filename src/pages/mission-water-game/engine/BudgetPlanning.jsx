import React, { useState } from 'react';
import StarCanvas from './StarCanvas.jsx';
import Blippy from './Blippy.jsx';

// ─── palette ─────────────────────────────────────────────────────────────────
const SPACE_DARK = '#070B14';
const PANEL_BG   = '#0A1628';
const CYAN       = '#00E5CC';
const AMBER      = '#FFB703';
const RED        = '#FF4C4C';
const TEXT_SOFT  = '#C8D8F0';

// ─── resource icon SVGs ───────────────────────────────────────────────────────
const RESOURCE_ICONS = {
  sampling_kits: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  ),
  data_access: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  community_partnerships: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  media_coverage: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6l10 4L21 6" />
      <path d="M1 6v12l10 4 10-4V6" />
    </svg>
  ),
};

const RESOURCE_LABELS = {
  sampling_kits: 'SAMPLING KITS',
  data_access: 'DATA ACCESS',
  community_partnerships: 'COMMUNITY PARTNERSHIPS',
  media_coverage: 'MEDIA REACH',
};

const RESOURCE_DESCS = {
  sampling_kits: 'Physical collection & field testing',
  data_access: 'Research databases & satellite data',
  community_partnerships: 'Local networks & on-the-ground intel',
  media_coverage: 'Press access & public communication',
};

// ─── single resource allocation row ──────────────────────────────────────────
function AllocRow({ type, value, ringColor, onInc, onDec, maxVal, spent, total }) {
  const canDec = value > 0;
  const canInc = value < maxVal && spent < total;

  return (
    <div style={styles.allocRow}>
      <div style={{ ...styles.allocIcon, color: ringColor }}>
        {RESOURCE_ICONS[type]}
      </div>
      <div style={styles.allocInfo}>
        <div style={styles.allocLabel}>{RESOURCE_LABELS[type]}</div>
        <div style={styles.allocDesc}>{RESOURCE_DESCS[type]}</div>
      </div>

      {/* meter */}
      <div style={styles.meterWrap}>
        {Array.from({ length: maxVal }, (_, i) => (
          <div
            key={i}
            style={{
              ...styles.meterCell,
              background: i < value ? ringColor : 'rgba(255,255,255,0.07)',
              boxShadow: i < value ? `0 0 6px ${ringColor}70` : 'none',
            }}
          />
        ))}
      </div>

      {/* controls */}
      <div style={styles.controls}>
        <button
          style={{
            ...styles.ctrlBtn,
            opacity: canDec ? 1 : 0.25,
            borderColor: canDec ? CYAN : 'rgba(255,255,255,0.1)',
          }}
          onClick={canDec ? onDec : undefined}
          disabled={!canDec}
          aria-label={`Decrease ${RESOURCE_LABELS[type]}`}
        >
          −
        </button>
        <span style={{ ...styles.ctrlValue, color: ringColor }}>
          {String(value).padStart(2, '0')}
        </span>
        <button
          style={{
            ...styles.ctrlBtn,
            opacity: canInc ? 1 : 0.25,
            borderColor: canInc ? CYAN : 'rgba(255,255,255,0.1)',
          }}
          onClick={canInc ? onInc : undefined}
          disabled={!canInc}
          aria-label={`Increase ${RESOURCE_LABELS[type]}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────
/**
 * BudgetPlanning — post-role-selection instrument panel.
 *
 * Props:
 *   selectedRole   {Object}   the chosen role from roles.json
 *   rolesData      {Object}   full roles.json (for budget_total, budget_per_type_max)
 *   onConfirm      {Function} called with the final resources object { sampling_kits, ... }
 *   onBack         {Function} go back to role select
 */
export default function BudgetPlanning({ selectedRole, rolesData, onConfirm, onBack }) {
  const TOTAL  = rolesData?.budget_total ?? 10;
  const MAXPER = rolesData?.budget_per_type_max ?? 4;

  const [resources, setResources] = useState(() => ({
    ...selectedRole.starting_resources,
  }));

  const spent = Object.values(resources).reduce((a, b) => a + b, 0);
  const remaining = TOTAL - spent;

  const adjust = (type, delta) => {
    setResources((prev) => {
      const next = (prev[type] ?? 0) + delta;
      if (next < 0 || next > MAXPER) return prev;
      const newSpent = Object.values(prev).reduce((a, b) => a + b, 0) + delta;
      if (newSpent < 0 || newSpent > TOTAL) return prev;
      return { ...prev, [type]: next };
    });
  };

  // keyboard shortcuts: arrow keys for first focused row — simplified to no-op
  // (full keyboard nav would need focus tracking; layout is simple enough with mouse)

  const handleConfirm = () => {
    if (remaining === 0) onConfirm(resources);
  };

  const ringColor = selectedRole.ring_color ?? CYAN;

  // Role flavor text — briefing bullets for left column
  const roleFlavorBullets = selectedRole.description
    ? [
        selectedRole.description,
        `Specialty: ${selectedRole.specialty || 'Field Investigation'}`,
        `Strength: ${selectedRole.strength || 'Adaptive resource allocation'}`,
        `Objective: Deploy, gather critical data, report findings to the Council.`,
      ]
    : [
        'You have been selected for field deployment in the water investigation.',
        'Your role carries unique access and specialized equipment.',
        'Resource allocation determines your investigative reach and depth.',
        'The Council awaits your findings. Deploy with purpose.',
      ];

  return (
    <div style={styles.root}>
      {/* Layer 1: space background */}
      <div style={{ position: 'absolute', inset: 0, background: SPACE_DARK }}>
        <StarCanvas seed={0xbeefdead} />
      </div>

      {/* Flicker keyframe for row entrance animations */}
      <style>{`
        @keyframes bp-row-flicker {
          0%   { opacity: 0;   }
          25%  { opacity: 0.3; }
          100% { opacity: 1;   }
        }
        @media (prefers-reduced-motion: reduce) {
          .bp-alloc-row { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
      <div style={styles.scanlines} />

      {/* ── Main two-column layout ── */}
      <div style={styles.twoCol}>

        {/* ── LEFT COLUMN — mission briefing ── */}
        <div style={styles.leftCol}>
          <div style={styles.briefingKicker}>MISSION LOADOUT</div>
          <div style={styles.briefingAccentLine} />
          <div style={styles.briefingHeader}>PRE-DEPLOYMENT BRIEF</div>

          <div style={{ ...styles.briefingRoleName, color: ringColor }}>
            {selectedRole.name?.toUpperCase() || 'FIELD AGENT'}
          </div>
          <div style={styles.briefingRoleDesc}>
            {selectedRole.description || 'Specialist field operative assigned to the water crisis investigation.'}
          </div>

          <div style={styles.briefingBullets}>
            {roleFlavorBullets.map((b, i) => (
              <div key={i} style={styles.briefingBullet}>
                <span style={{ ...styles.briefingBulletDot, color: ringColor }}>▸</span>
                <span style={styles.briefingBulletText}>{b}</span>
              </div>
            ))}
          </div>

          {/* Blippy — shared full-body component, lower-left of the briefing
              column, FLIPPED so he faces the allocation panel (the action). */}
          {/* Default pose gestures right — toward the allocation panel. */}
          <div style={styles.blippyAnchor}>
            <Blippy
              text="Spend every point with + and −, then hit DEPLOY MISSION. Your loadout is your lifeline down there."
            />
          </div>
        </div>

        {/* ── RIGHT COLUMN — resource allocation panel ── */}
        <div style={styles.rightCol}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div style={styles.panelLabel}>RESOURCE ALLOCATION PANEL</div>
              <div style={styles.budgetIndicator}>
                <span style={{ color: TEXT_SOFT, fontSize: 10, fontFamily: '"Orbitron", monospace', letterSpacing: '0.12em' }}>REMAINING</span>
                <span
                  style={{
                    ...styles.budgetValue,
                    color: remaining === 0 ? CYAN : remaining <= 2 ? AMBER : '#FFFFFF',
                  }}
                >
                  {String(remaining).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')}
                </span>
              </div>
            </div>

            <div style={styles.headerSub}>
              Redistribute {TOTAL} points · Max {MAXPER} per category
            </div>

            {/* allocation rows — staggered flicker entrance */}
            <div style={styles.rowsWrap}>
              {Object.keys(selectedRole.starting_resources).map((type, idx) => (
                <div
                  key={type}
                  className="bp-alloc-row"
                  style={{
                    opacity: 0,
                    animation: 'bp-row-flicker 200ms ease forwards',
                    animationDelay: `${300 + idx * 120}ms`,
                  }}
                >
                  <AllocRow
                    type={type}
                    value={resources[type] ?? 0}
                    ringColor={ringColor}
                    spent={spent}
                    total={TOTAL}
                    maxVal={MAXPER}
                    onInc={() => adjust(type, 1)}
                    onDec={() => adjust(type, -1)}
                  />
                </div>
              ))}
            </div>

            {/* budget bar */}
            <div style={styles.budgetBarWrap}>
              <div style={styles.budgetBarLabel}>BUDGET UTILIZATION</div>
              <div style={styles.budgetBarTrack}>
                <div
                  style={{
                    ...styles.budgetBarFill,
                    width: `${(spent / TOTAL) * 100}%`,
                    background: spent === TOTAL ? CYAN : AMBER,
                    boxShadow: spent === TOTAL ? `0 0 10px ${CYAN}80` : 'none',
                  }}
                />
              </div>
              <div
                style={{
                  ...styles.budgetBarPct,
                  color: spent === TOTAL ? CYAN : TEXT_SOFT,
                }}
              >
                {Math.round((spent / TOTAL) * 100)}%
              </div>
            </div>

            {remaining > 0 && (
              <div style={styles.warningMsg}>
                ⚠ &nbsp; {remaining} POINT{remaining !== 1 ? 'S' : ''} UNALLOCATED — ASSIGN ALL RESOURCES BEFORE LAUNCH
              </div>
            )}
          </div>

          {/* ── DEPLOY CTA ── */}
          <div style={styles.ctaRow}>
            <button style={styles.backBtn} onClick={onBack}>
              ← CHANGE ROLE
            </button>
            <button
              style={{
                ...styles.deployBtn,
                opacity: remaining === 0 ? 1 : 0.35,
                cursor: remaining === 0 ? 'pointer' : 'not-allowed',
                boxShadow: remaining === 0 ? `0 0 28px ${CYAN}70, 0 0 60px ${CYAN}30` : 'none',
              }}
              disabled={remaining !== 0}
              onClick={handleConfirm}
            >
              ◉ &nbsp; DEPLOY MISSION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    background: SPACE_DARK,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
    color: '#FFFFFF',
    overflow: 'hidden',
    zIndex: 10,
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
    zIndex: 1,
  },

  // ── Two-column layout ────────────────────────────────────────────
  twoCol: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },

  leftCol: {
    flex: '0 0 38%',
    display: 'flex',
    flexDirection: 'column',
    // Bottom padding reserves the lower-left zone for full-body Blippy so the
    // briefing text never runs underneath him (R18a).
    padding: '48px 40px 310px',
    background: 'linear-gradient(160deg, rgba(0,229,204,0.06) 0%, rgba(7,11,20,0.0) 60%)',
    borderRight: `1px solid rgba(0,229,204,0.14)`,
    position: 'relative',
    overflow: 'hidden',
  },

  rightCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '36px 40px 28px',
    overflow: 'hidden',
    gap: 16,
  },

  // ── Left column — briefing ───────────────────────────────────────
  briefingKicker: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    letterSpacing: '0.35em',
    color: CYAN,
    textTransform: 'uppercase',
    marginBottom: 10,
    opacity: 0.9,
  },
  briefingAccentLine: {
    width: 48,
    height: 2,
    background: CYAN,
    marginBottom: 14,
    boxShadow: `0 0 8px ${CYAN}80`,
  },
  briefingHeader: {
    fontFamily: '"Orbitron", monospace',
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#FFFFFF',
    lineHeight: 1.2,
    marginBottom: 24,
  },
  briefingRoleName: {
    fontFamily: '"Orbitron", monospace',
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  briefingRoleDesc: {
    fontFamily: '"Rajdhani", sans-serif',
    fontWeight: 500,
    fontSize: 15,
    lineHeight: 1.55,
    color: TEXT_SOFT,
    marginBottom: 24,
  },
  briefingBullets: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flex: 1,
  },
  briefingBullet: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  briefingBulletDot: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 11,
    marginTop: 2,
    flexShrink: 0,
  },
  briefingBulletText: {
    fontFamily: '"Rajdhani", sans-serif',
    fontWeight: 400,
    fontSize: 14,
    lineHeight: 1.55,
    color: TEXT_SOFT,
    opacity: 0.85,
  },

  // ── Right column — panel ─────────────────────────────────────────
  headerSub: {
    fontFamily: '"Rajdhani", system-ui, sans-serif',
    fontSize: 13,
    color: TEXT_SOFT,
    opacity: 0.6,
    letterSpacing: '0.04em',
    marginBottom: 4,
  },

  panel: {
    zIndex: 2,
    background: PANEL_BG,
    border: `1px solid rgba(0,229,204,0.18)`,
    borderRadius: 4,
    padding: '20px 24px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    boxShadow: `inset 0 0 40px rgba(0,229,204,0.04)`,
    overflow: 'hidden',
  },

  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid rgba(0,229,204,0.12)`,
    paddingBottom: 12,
  },
  panelLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    letterSpacing: '0.25em',
    color: CYAN,
    opacity: 0.7,
  },
  budgetIndicator: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
    fontFamily: '"Orbitron", monospace',
  },
  budgetValue: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '0.1em',
    lineHeight: 1,
    transition: 'color 200ms ease',
  },

  rowsWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flex: 1,
  },

  allocRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  allocIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    width: 24,
    justifyContent: 'center',
  },
  allocInfo: {
    flex: 1,
    minWidth: 0,
  },
  allocLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    letterSpacing: '0.18em',
    color: TEXT_SOFT,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  allocDesc: {
    fontFamily: '"Rajdhani", system-ui, sans-serif',
    fontSize: 11,
    color: TEXT_SOFT,
    opacity: 0.5,
    marginTop: 2,
  },

  meterWrap: {
    display: 'flex',
    gap: 4,
    flexShrink: 0,
  },
  meterCell: {
    width: 14,
    height: 14,
    borderRadius: 2,
    transition: 'background 150ms ease, box-shadow 150ms ease',
  },

  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  ctrlBtn: {
    width: 28,
    height: 28,
    background: 'transparent',
    border: '1px solid',
    borderRadius: 3,
    color: '#FFFFFF',
    fontFamily: '"Orbitron", monospace',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 120ms ease, border-color 120ms ease',
    lineHeight: 1,
    padding: 0,
  },
  ctrlValue: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 18,
    fontWeight: 700,
    width: 30,
    textAlign: 'center',
    transition: 'color 150ms ease',
  },

  budgetBarWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderTop: '1px solid rgba(0,229,204,0.10)',
    paddingTop: 12,
    marginTop: 'auto',
  },
  budgetBarLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    letterSpacing: '0.2em',
    color: TEXT_SOFT,
    opacity: 0.5,
    flexShrink: 0,
  },
  budgetBarTrack: {
    flex: 1,
    height: 6,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 200ms ease, background 200ms ease, box-shadow 200ms ease',
  },
  budgetBarPct: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 10,
    letterSpacing: '0.1em',
    flexShrink: 0,
    width: 36,
    textAlign: 'right',
    transition: 'color 200ms ease',
  },

  warningMsg: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    letterSpacing: '0.15em',
    color: AMBER,
    textAlign: 'center',
    opacity: 0.85,
    padding: '6px 0',
  },

  // ── CTA row (deploy) ─────────────────────────────────────────────
  ctaRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexShrink: 0,
  },
  backBtn: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 10,
    letterSpacing: '0.15em',
    color: TEXT_SOFT,
    background: 'transparent',
    border: `1px solid rgba(200,216,240,0.25)`,
    borderRadius: 4,
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'border-color 150ms ease',
    flexShrink: 0,
  },
  deployBtn: {
    flex: 1,
    fontFamily: '"Orbitron", monospace',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: SPACE_DARK,
    background: CYAN,
    border: 'none',
    borderRadius: 4,
    padding: '16px 32px',
    cursor: 'pointer',
    transition: 'opacity 150ms ease, box-shadow 150ms ease',
  },

  // ── Blippy companion — shared full-body component ────────────────
  blippyAnchor: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    zIndex: 3,
    pointerEvents: 'none',
  },
};
