import React, { useState, useEffect, useCallback } from 'react';
import StarCanvas from './StarCanvas.jsx';

// ─── prefers-reduced-motion ───────────────────────────────────────────────────
const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── palette ────────────────────────────────────────────────────────────────
const SPACE_DARK = '#070B14';
const PANEL_BG   = '#0A1628';
const CYAN       = '#00E5CC';
const AMBER      = '#FFB703';
const TEXT_SOFT  = '#C8D8F0';
const BORDER_DIM = 'rgba(0,229,204,0.15)';

// ─── resource icon SVGs (inline, no dependency) ─────────────────────────────
const RESOURCE_ICONS = {
  sampling_kits: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  ),
  data_access: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  community_partnerships: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  media_coverage: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6l10 4L21 6" />
      <path d="M1 6v12l10 4 10-4V6" />
    </svg>
  ),
};

const RESOURCE_LABELS = {
  sampling_kits: 'SAMPLING KITS',
  data_access: 'DATA ACCESS',
  community_partnerships: 'PARTNERSHIPS',
  media_coverage: 'MEDIA REACH',
};

// ─── single resource pip row ─────────────────────────────────────────────────
function ResourceRow({ type, value, ringColor }) {
  const pips = Array.from({ length: 4 }, (_, i) => i < value);
  return (
    <div style={styles.resourceRow}>
      <span style={{ ...styles.resourceIcon, color: ringColor }}>
        {RESOURCE_ICONS[type]}
      </span>
      <span style={styles.resourceLabel}>{RESOURCE_LABELS[type]}</span>
      <div style={styles.pipRow}>
        {pips.map((filled, i) => (
          <div
            key={i}
            style={{
              ...styles.pip,
              background: filled ? ringColor : 'rgba(255,255,255,0.08)',
              boxShadow: filled ? `0 0 5px ${ringColor}80` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── single role card ─────────────────────────────────────────────────────────
function RoleCard({ role, isSelected, isFocused, onClick, onFocus }) {
  const { name, description, flavor, image, ring_color, starting_resources } = role;

  const borderColor = (isSelected || isFocused) ? ring_color : BORDER_DIM;
  const glow = (isSelected || isFocused)
    ? `0 0 0 1px ${ring_color}, 0 0 28px ${ring_color}40`
    : 'none';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Select ${name}`}
      style={{
        ...styles.card,
        borderColor,
        boxShadow: glow,
        background: (isSelected || isFocused)
          ? `linear-gradient(160deg, ${ring_color}14 0%, ${PANEL_BG} 60%)`
          : PANEL_BG,
      }}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
    >
      {/* role image */}
      <div style={styles.imageWrap}>
        <img
          src={image}
          alt={name}
          style={{
            ...styles.roleImage,
            filter: (isSelected || isFocused)
              ? `drop-shadow(0 0 12px ${ring_color})`
              : 'brightness(0.7)',
          }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div
          style={{
            ...styles.imageBadgeBorder,
            borderColor: (isSelected || isFocused) ? ring_color : 'rgba(255,255,255,0.12)',
            boxShadow: (isSelected || isFocused) ? `0 0 18px ${ring_color}60` : 'none',
          }}
        />
      </div>

      {/* name */}
      <div style={{ ...styles.roleName, color: (isSelected || isFocused) ? ring_color : TEXT_SOFT }}>
        {name.toUpperCase()}
      </div>

      {/* flavor */}
      <div style={styles.roleFlavor}>{flavor}</div>

      {/* description */}
      <div style={styles.roleDesc}>{description}</div>

      {/* resources */}
      <div style={styles.resourcesWrap}>
        {Object.entries(starting_resources).map(([type, value]) => (
          <ResourceRow key={type} type={type} value={value} ringColor={ring_color} />
        ))}
      </div>

      {/* selected indicator */}
      {isSelected && (
        <div style={{ ...styles.selectedBadge, background: ring_color }}>
          SELECTED
        </div>
      )}
    </div>
  );
}

// ─── main export ─────────────────────────────────────────────────────────────
/**
 * RoleSelect — renders before the phase engine starts.
 *
 * R18a: header + cards + confirm now live inside ONE instrument panel
 * (fixed internal spacing — no more full-viewport vertical spread), and the
 * cadet is greeted by name.
 *
 * Props:
 *   rolesData  {Object}   parsed roles.json
 *   playerName {string}   the cadet's name from NameEntryScreen
 *   onConfirm  {Function} called with the chosen role object
 */
export default function RoleSelect({ rolesData, playerName = '', onConfirm }) {
  const roles = rolesData?.roles ?? [];
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  // ── Entrance animations ──────────────────────────────────────────────────
  // headerReady: header fades in at 100ms
  // cardVisible[i]: card fan-in at 200 / 350 / 500ms
  const [headerReady,   setHeaderReady]   = useState(REDUCED);
  const [cardVisible,   setCardVisible]   = useState(REDUCED ? [true, true, true] : [false, false, false]);

  useEffect(() => {
    if (REDUCED) return;
    const t0 = setTimeout(() => setHeaderReady(true), 100);
    const t1 = setTimeout(() => setCardVisible((v) => { const n=[...v]; n[0]=true; return n; }), 200);
    const t2 = setTimeout(() => setCardVisible((v) => { const n=[...v]; n[1]=true; return n; }), 350);
    const t3 = setTimeout(() => setCardVisible((v) => { const n=[...v]; n[2]=true; return n; }), 500);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // keyboard nav
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowRight') {
        setFocusedIdx((i) => (i + 1) % roles.length);
      } else if (e.key === 'ArrowLeft') {
        setFocusedIdx((i) => (i - 1 + roles.length) % roles.length);
      } else if (e.key === 'Enter') {
        if (selectedId) {
          const role = roles.find((r) => r.id === selectedId);
          if (role) onConfirm(role);
        } else {
          setSelectedId(roles[focusedIdx]?.id ?? null);
        }
      }
    },
    [roles, focusedIdx, selectedId, onConfirm],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCardClick = (role) => {
    setSelectedId(role.id);
    setFocusedIdx(roles.findIndex((r) => r.id === role.id));
  };

  const handleConfirm = () => {
    const role = roles.find((r) => r.id === selectedId);
    if (role) onConfirm(role);
  };

  const cadet = (playerName || 'Cadet').trim();

  return (
    <div style={styles.root}>
      {/* Layer 1: space background */}
      <div style={{ position: 'absolute', inset: 0, background: SPACE_DARK }}>
        <StarCanvas seed={0xdeadbeef} />
      </div>

      {/* scanline overlay */}
      <div style={styles.scanlines} />

      {/* Scrollable overlay — centers ONE instrument panel (R18a) */}
      <div style={styles.overlay}>
        <div style={styles.flex1} />

        <div style={{
          ...styles.panel,
          opacity:    headerReady ? 1 : 0,
          transform:  headerReady ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 400ms ease, transform 400ms ease',
        }}>
          {/* header */}
          <div style={styles.header}>
 <div style={styles.headerKicker}>MISSION WATER, INVESTIGATOR SELECTION</div>
            <h1 style={styles.headerTitle}>
              SELECT YOUR ROLE, {cadet.toUpperCase()}
            </h1>
            <div style={styles.headerSub}>
              Each role starts with different resource allocations.&nbsp;
              You will refine your loadout before deployment.
            </div>
          </div>

          {/* cards — fan in, staggered 150ms */}
          <div style={styles.cardsRow}>
            {roles.map((role, idx) => (
              <div
                key={role.id}
                style={{
                  flex: '1 1 260px',
                  maxWidth: 340,
                  opacity:    cardVisible[idx] ? 1 : 0,
                  transform:  cardVisible[idx] ? 'translateY(0)' : 'translateY(24px)',
                  transition: 'opacity 300ms ease, transform 300ms ease',
                  display: 'flex',
                }}
              >
                <RoleCard
                  role={role}
                  isSelected={selectedId === role.id}
                  isFocused={focusedIdx === idx && selectedId !== role.id}
                  onClick={() => handleCardClick(role)}
                  onFocus={() => setFocusedIdx(idx)}
                />
              </div>
            ))}
          </div>

          {/* confirm */}
          <div style={styles.footer}>
            <div style={styles.keyHint}>
              ← → NAVIGATE &nbsp;·&nbsp; ENTER SELECT &nbsp;·&nbsp; CLICK TO CHOOSE
            </div>
            <button
              style={{
                ...styles.confirmBtn,
                opacity: selectedId ? 1 : 0.35,
                cursor: selectedId ? 'pointer' : 'not-allowed',
              }}
              disabled={!selectedId}
              onClick={handleConfirm}
            >
              CONFIRM ROLE → PLAN LOADOUT
            </button>
          </div>
        </div>

        <div style={styles.flex1} />
      </div>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = {
  root: {
    position: 'absolute',
    inset: 0,
    background: SPACE_DARK,
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

  // R18a — scrollable overlay centering the single instrument panel
  overlay: {
    position: 'absolute',
    inset: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    zIndex: 2,
  },
  flex1: { flex: 1, minHeight: 20 },

  // DESIGN.md .instrument-panel — header + cards + confirm all live in here,
  // so the internal spacing is FIXED regardless of window height.
  panel: {
    width: '100%',
    maxWidth: 1140,
    boxSizing: 'border-box',
    background: 'rgba(7,11,20,0.88)',
    border: '1px solid rgba(0,229,204,0.25)',
    borderRadius: 4,
    boxShadow: '0 0 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(0,229,204,0.08)',
    padding: 'clamp(22px, 3vw, 34px) clamp(18px, 3vw, 36px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },

  header: {
    textAlign: 'center',
    flexShrink: 0,
  },
  headerKicker: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    letterSpacing: '0.3em',
    color: CYAN,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    margin: 0,
    color: '#FFFFFF',
  },
  headerSub: {
    fontFamily: '"Rajdhani", system-ui, sans-serif',
    fontSize: 14,
    color: TEXT_SOFT,
    marginTop: 10,
    opacity: 0.75,
  },

  cardsRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
    alignItems: 'stretch',
    width: '100%',
  },

  card: {
    flex: '1 1 0',
    maxWidth: 340,
    background: PANEL_BG,
    border: '1px solid',
    borderRadius: 6,
    padding: '20px 18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    position: 'relative',
    transition: 'border-color 180ms ease, box-shadow 180ms ease, background 180ms ease',
    outline: 'none',
  },

  imageWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    flexShrink: 0,
  },
  roleImage: {
    width: 96,
    height: 96,
    objectFit: 'cover',
    borderRadius: '50%',
    transition: 'filter 180ms ease',
    position: 'relative',
    zIndex: 1,
  },
  imageBadgeBorder: {
    position: 'absolute',
    inset: -3,
    borderRadius: '50%',
    border: '2px solid',
    transition: 'border-color 180ms ease, box-shadow 180ms ease',
    zIndex: 2,
    pointerEvents: 'none',
  },

  roleName: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textAlign: 'center',
    transition: 'color 180ms ease',
  },
  roleFlavor: {
    fontFamily: '"Rajdhani", system-ui, sans-serif',
    fontSize: 11,
    letterSpacing: '0.12em',
    color: AMBER,
    textTransform: 'uppercase',
    textAlign: 'center',
    opacity: 0.85,
  },
  roleDesc: {
    fontFamily: '"Rajdhani", system-ui, sans-serif',
    fontSize: 13,
    lineHeight: 1.5,
    color: TEXT_SOFT,
    textAlign: 'center',
    opacity: 0.85,
    flexShrink: 0,
  },

  resourcesWrap: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 4,
  },
  resourceRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resourceIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  resourceLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    letterSpacing: '0.18em',
    color: TEXT_SOFT,
    opacity: 0.7,
    flex: 1,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  pipRow: {
    display: 'flex',
    gap: 3,
    flexShrink: 0,
  },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 2,
    transition: 'background 200ms ease, box-shadow 200ms ease',
  },

  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontFamily: '"Orbitron", monospace',
    fontSize: 7,
    letterSpacing: '0.2em',
    color: SPACE_DARK,
    padding: '3px 7px',
    borderRadius: 2,
    fontWeight: 700,
  },

  footer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  keyHint: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    letterSpacing: '0.22em',
    color: 'rgba(200,216,240,0.4)',
    textTransform: 'uppercase',
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

};