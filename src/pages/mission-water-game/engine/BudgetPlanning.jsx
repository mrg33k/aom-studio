import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── StarCanvas (space background — DESIGN.md Layer 1) ───────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function StarCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rand = mulberry32(0xbeefdead);
    const LAYERS = [
      { count: 180, minR: 0.4, maxR: 1.1, minA: 0.25, maxA: 0.65, spd: 0.012 },
      { count: 70,  minR: 0.9, maxR: 2.0, minA: 0.50, maxA: 1.00, spd: 0.022 },
    ];
    let W = 0, H = 0, raf;
    let stars = [];
    function buildStars(w, h) {
      stars = [];
      for (const L of LAYERS) {
        for (let i = 0; i < L.count; i++) {
          stars.push({
            x: rand() * w, y: rand() * h,
            r: L.minR + rand() * (L.maxR - L.minR),
            a: L.minA + rand() * (L.maxA - L.minA),
            spd: L.spd * (0.7 + rand() * 0.6),
            dx: (rand() - 0.5) * 0.006,
          });
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.y -= s.spd; s.x += s.dx;
        if (s.y < -2) s.y = H + 2;
        if (s.x < -2) s.x = W + 2;
        if (s.x > W + 2) s.x = -2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      canvas.width = width; canvas.height = height;
      W = width; H = height;
      buildStars(W, H);
    });
    ro.observe(canvas);
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

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

  return (
    <div style={styles.root}>
      {/* Layer 1: space background */}
      <div style={{ position: 'absolute', inset: 0, background: SPACE_DARK }}>
        <StarCanvas />
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

      {/* Blippy companion — lower-left, per DESIGN.md */}
      <div style={styles.blippyRow}>
        <div style={styles.blippyCircle}>
          <img
            src="/mission-water/welcome/blippy_welcome_pose.png"
            alt="Blippy"
            style={styles.blippyImg}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
        <div style={styles.blippyBubble}>
          Allocate your resources, Cadet. Every point matters when you're on the ground.
        </div>
      </div>

      {/* header */}
      <div style={styles.header}>
        <div style={styles.headerKicker}>MISSION WATER — PRE-DEPLOYMENT LOADOUT</div>
        <h1 style={styles.headerTitle}>PLAN YOUR MISSION RESOURCES</h1>
        <div style={{ ...styles.roleTag, color: ringColor }}>
          <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 10, letterSpacing: '0.2em' }}>
            ROLE: {selectedRole.name.toUpperCase()}
          </span>
        </div>
        <div style={styles.headerSub}>
          Redistribute {TOTAL} points across resource categories. Maximum {MAXPER} per type.
        </div>
      </div>

      {/* instrument panel */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelLabel}>RESOURCE ALLOCATION PANEL</div>
          <div style={styles.budgetIndicator}>
            <span style={{ color: TEXT_SOFT, fontSize: 10 }}>POINTS REMAINING</span>
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

      {/* footer */}
      <div style={styles.footer}>
        <button style={styles.backBtn} onClick={onBack}>
          ← CHANGE ROLE
        </button>
        <button
          style={{
            ...styles.confirmBtn,
            opacity: remaining === 0 ? 1 : 0.35,
            cursor: remaining === 0 ? 'pointer' : 'not-allowed',
            boxShadow: remaining === 0 ? `0 0 20px ${CYAN}60` : 'none',
          }}
          disabled={remaining !== 0}
          onClick={handleConfirm}
        >
          CONFIRM MISSION LOADOUT
        </button>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '28px 24px 20px',
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

  header: {
    textAlign: 'center',
    zIndex: 2,
    flexShrink: 0,
  },
  headerKicker: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    letterSpacing: '0.3em',
    color: CYAN,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerTitle: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    margin: '0 0 6px',
    color: '#FFFFFF',
  },
  roleTag: {
    marginBottom: 6,
  },
  headerSub: {
    fontFamily: '"Rajdhani", system-ui, sans-serif',
    fontSize: 14,
    color: TEXT_SOFT,
    opacity: 0.7,
  },

  panel: {
    zIndex: 2,
    background: PANEL_BG,
    border: `1px solid rgba(0,229,204,0.18)`,
    borderRadius: 6,
    padding: '20px 24px',
    width: '100%',
    maxWidth: 700,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: `inset 0 0 40px rgba(0,229,204,0.04)`,
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

  footer: {
    zIndex: 2,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    flexShrink: 0,
    paddingTop: 4,
  },
  backBtn: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 10,
    letterSpacing: '0.15em',
    color: TEXT_SOFT,
    background: 'transparent',
    border: `1px solid rgba(200,216,240,0.25)`,
    borderRadius: 4,
    padding: '10px 20px',
    cursor: 'pointer',
    transition: 'border-color 150ms ease',
  },
  confirmBtn: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: CYAN,
    background: 'transparent',
    border: `2px solid ${CYAN}`,
    borderRadius: 4,
    padding: '12px 32px',
    transition: 'opacity 150ms ease, box-shadow 150ms ease',
  },

  // Blippy companion
  blippyRow: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    zIndex: 3,
  },
  blippyCircle: {
    flexShrink: 0,
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: `2px solid ${CYAN}`,
    overflow: 'hidden',
    background: 'rgba(0,229,204,0.06)',
    boxShadow: `0 0 12px rgba(0,229,204,0.20)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blippyImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  blippyBubble: {
    background: 'rgba(7,11,20,0.92)',
    border: `1px solid ${CYAN}`,
    borderRadius: '8px 8px 8px 0',
    padding: '8px 12px',
    fontFamily: '"Rajdhani", sans-serif',
    fontWeight: 600,
    fontSize: 12,
    color: '#E8F0F8',
    lineHeight: 1.4,
    maxWidth: 200,
  },
};
