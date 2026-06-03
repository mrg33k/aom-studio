import React, { useEffect, useRef, useState } from 'react';

/**
 * HUD — overlays the Canvas with the Mission Water dashboard.
 *
 *   Top-left:   Chapter pill (CH 01 / CH 02 / CH 03)
 *   Top-center: Three stat widgets (Water Crisis, Investigation, Discoveries)
 *               styled to match hud_stat_widgets.png — cyan-glow card with
 *               icon tile + gradient progress bar + value readout.
 *   Top-right:  Earned discovery badges — Cleo's circular badge artwork.
 *   Bottom:     Narrative card + pill-shaped choice buttons styled to match
 *               hud_choice_buttons.png — NORMAL / HOVER / SELECTED.
 *   Council reveal phase: badges are presented inside the ornate gold frame
 *               (hud_badge_frame.png) as a celebratory award moment.
 *
 * Keyboard:
 *   ↑/↓/←/→  move focus across choice buttons
 *   Enter    commit focused choice
 */

const BADGE_ART = {
  groundwater_hydrology: '/mission-water/chapter-1/badges/badge_groundwater_hydrology.png',
  environmental_chemistry: '/mission-water/chapter-1/badges/badge_environmental_chemistry.png',
  climate_science: '/mission-water/chapter-1/badges/badge_climate_science.png',
  water_security: '/mission-water/chapter-1/badges/badge_water_security.png',
  mission_imperative: '/mission-water/chapter-1/badges/badge_mission_imperative.png',
  pete_conrad_legacy: '/mission-water/chapter-1/badges/badge_pete_conrad_legacy.png',
};

const DISCOVERY_LABELS = {
  groundwater_hydrology: 'Groundwater Hydrology',
  environmental_chemistry: 'Environmental Chemistry',
  climate_science: 'Climate Science',
  water_security: 'Water Security',
  mission_imperative: 'Mission Imperative',
  pete_conrad_legacy: 'Pete Conrad Legacy',
  // Legacy / branch-secondary IDs still rendered as text-only chips.
  social_impact: 'Social Impact',
  public_health: 'Public Health',
  food_water_nexus: 'Food–Water Nexus',
  lunar_water_connection: 'Lunar Water Connection',
};

const BADGE_FRAME = '/mission-water/chapter-1/hud/hud_badge_frame.png';

export default function HUD({ phase, hud, onChoose }) {
  const [focusIdx, setFocusIdx] = useState(0);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const btnsRef = useRef([]);
  const choices = (phase && phase.choices) || [];

  // Reset focus to first choice on phase change.
  useEffect(() => {
    setFocusIdx(0);
    setHoverIdx(-1);
    const t = setTimeout(() => {
      if (btnsRef.current[0]) btnsRef.current[0].focus();
    }, 50);
    return () => clearTimeout(t);
  }, [phase && phase.id]);

  // Global key handler for arrow keys + Enter.
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

  const isCouncil = phase.id === 'ch1_council_reveal' || phase.id === 'ch1_end';

  return (
    <div style={styles.root}>
      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <div style={styles.topBar}>
        <ChapterPill chapter={phase.chapter} />
        <StatRow hud={hud} />
        <BadgeRow ids={hud.discovery_ids || []} />
      </div>

      {/* ── COUNCIL FRAMED AWARD (mid-stage) ───────────────────── */}
      {isCouncil && (hud.discovery_ids || []).length > 0 && (
        <FramedAwards ids={hud.discovery_ids} />
      )}

      {/* ── NARRATIVE + CHOICES ─────────────────────────────────── */}
      <div style={styles.bottom}>
        <div style={styles.narrativeCard}>
          {phase.title && (
            <div style={styles.kicker}>
              {hud.region ? `${hud.region.toUpperCase()} · ` : ''}{phase.title}
            </div>
          )}
          <p style={styles.narrative}>{phase.narrative}</p>
          {choices.length > 0 ? (
            <div style={styles.choices}>
              {choices.map((c, idx) => {
                const isSelected = focusIdx === idx;
                const isHover = hoverIdx === idx && !isSelected;
                const btnStyle = {
                  ...styles.choiceBtn,
                  ...(isHover ? styles.choiceBtnHover : null),
                  ...(isSelected ? styles.choiceBtnSelected : null),
                };
                return (
                  <button
                    key={c.id}
                    ref={(el) => (btnsRef.current[idx] = el)}
                    onClick={() => onChoose(c.id)}
                    onFocus={() => setFocusIdx(idx)}
                    onMouseEnter={() => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx(-1)}
                    style={btnStyle}
                  >
                    <span
                      style={{
                        ...styles.choiceDot,
                        ...(isSelected ? styles.choiceDotSelected : null),
                      }}
                    />
                    <span
                      style={{
                        ...styles.choiceText,
                        ...(isSelected ? styles.choiceTextSelected : null),
                      }}
                    >
                      {c.text}
                    </span>
                    {isSelected && <span style={styles.choiceCheck}>✓</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={styles.terminal}>End of chapter — more is coming.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── subcomponents ────────────────────────────────────────────────────────────

function ChapterPill({ chapter }) {
  const n = String(chapter || 1).padStart(2, '0');
  return (
    <div style={styles.chapterPill}>
      <span style={styles.chapterDot} />
      <span style={styles.chapterLabel}>CH {n}</span>
    </div>
  );
}

function StatRow({ hud }) {
  if (!hud) return null;
  return (
    <div style={styles.statRow}>
      <StatCard
        icon={<DropIcon />}
        label="Water Crisis"
        value={hud.water_crisis}
        suffix="%"
      />
      <StatCard
        icon={<MagnifyIcon />}
        label="Investigation"
        value={hud.investigation_progress}
        suffix="%"
      />
      <StatCard
        icon={<BadgeIcon />}
        label="Discoveries"
        value={Math.min(100, ((hud.discoveries || 0) / 3) * 100)}
        displayValue={hud.discoveries || 0}
        suffix=""
      />
    </div>
  );
}

function StatCard({ icon, label, value, suffix = '%', displayValue }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const shown = displayValue != null ? displayValue : Math.round(pct);
  return (
    <div style={styles.statCard}>
      <div style={styles.statIconTile}>{icon}</div>
      <div style={styles.statBody}>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statBarRow}>
          <div style={styles.statBarTrack}>
            <div style={{ ...styles.statBarFill, width: `${pct}%` }} />
          </div>
          <div style={styles.statBarValue}>
            {shown}
            {suffix}
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgeRow({ ids }) {
  if (!ids || ids.length === 0) {
    return (
      <div style={styles.badgeRow}>
        <div style={styles.badgeEmpty}>NO DISCOVERIES YET</div>
      </div>
    );
  }
  return (
    <div style={styles.badgeRow}>
      {ids.map((id) => {
        const art = BADGE_ART[id];
        const label = DISCOVERY_LABELS[id] || id;
        return (
          <div key={id} style={styles.badgeTile} title={label}>
            {art ? (
              <img src={art} alt={label} style={styles.badgeImg} />
            ) : (
              <div style={styles.badgeTextOnly}>{label}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FramedAwards({ ids }) {
  // Show framed awards for badges that have artwork (filters out legacy
  // text-only discovery ids like social_impact, public_health, etc.).
  const awarded = ids.filter((id) => BADGE_ART[id]);
  if (awarded.length === 0) return null;
  return (
    <div style={styles.awardRow}>
      {awarded.map((id) => (
        <div key={id} style={styles.awardSlot}>
          <img src={BADGE_FRAME} alt="" style={styles.awardFrame} />
          <img src={BADGE_ART[id]} alt="" style={styles.awardBadge} />
          <div style={styles.awardLabel}>{DISCOVERY_LABELS[id] || id}</div>
        </div>
      ))}
    </div>
  );
}

// ─── inline SVG icons (match the cyan reference aesthetic) ────────────────────

function DropIcon() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden>
      <defs>
        <linearGradient id="dropG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7FE9FF" />
          <stop offset="100%" stopColor="#2BC0E4" />
        </linearGradient>
      </defs>
      <path
        d="M16 4 C 22 12, 26 17, 26 22 A 10 10 0 0 1 6 22 C 6 17, 10 12, 16 4 Z"
        fill="url(#dropG)"
        stroke="#9EF1FF"
        strokeWidth="1"
      />
      <ellipse cx="16" cy="27" rx="8" ry="1.6" fill="none" stroke="#9EF1FF" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

function MagnifyIcon() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden>
      <circle cx="13" cy="13" r="7.5" fill="none" stroke="#7FE9FF" strokeWidth="2" />
      <path d="M19 19 L26 26" stroke="#7FE9FF" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 14 L12 11 L15 14 L19 9" fill="none" stroke="#2BC0E4" strokeWidth="1.4" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden>
      <path
        d="M16 4 L26 9 L26 17 A10 10 0 0 1 16 27 A10 10 0 0 1 6 17 L6 9 Z"
        fill="none"
        stroke="#7FE9FF"
        strokeWidth="2"
      />
      <path
        d="M16 9 L17.8 13 L22 13.6 L18.8 16.4 L19.6 20.4 L16 18.4 L12.4 20.4 L13.2 16.4 L10 13.6 L14.2 13 Z"
        fill="#2BC0E4"
        stroke="#9EF1FF"
        strokeWidth="0.6"
      />
    </svg>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const CYAN = '#7FE9FF';
const CYAN_DEEP = '#2BC0E4';
const NAVY = '#0B132B';
const NAVY_DEEP = '#070C1C';
const BONE = '#F4ECDC';

const styles = {
  root: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
    color: BONE,
  },

  // ── top bar ────
  topBar: {
    pointerEvents: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: '18px 22px',
    background:
      'linear-gradient(to bottom, rgba(7,12,28,0.72) 0%, rgba(7,12,28,0) 100%)',
  },

  // ── chapter pill ────
  chapterPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    borderRadius: 999,
    background: 'rgba(127,233,255,0.08)',
    border: `1px solid rgba(127,233,255,0.4)`,
    boxShadow: '0 0 10px rgba(127,233,255,0.25)',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    letterSpacing: 1.6,
    color: CYAN,
    height: 'fit-content',
  },
  chapterDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: CYAN,
    boxShadow: '0 0 8px rgba(127,233,255,0.9)',
  },
  chapterLabel: { fontWeight: 700 },

  // ── stat row ────
  statRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
    flex: 1,
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    minWidth: 0,
    width: 200,
    borderRadius: 14,
    background:
      'linear-gradient(135deg, rgba(11,30,55,0.86) 0%, rgba(7,18,38,0.86) 100%)',
    border: `1px solid rgba(127,233,255,0.55)`,
    boxShadow:
      '0 0 14px rgba(127,233,255,0.22), inset 0 0 18px rgba(127,233,255,0.06)',
  },
  statIconTile: {
    width: 36,
    height: 36,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    background: 'rgba(8,18,38,0.95)',
    border: `1px solid rgba(127,233,255,0.55)`,
    boxShadow: 'inset 0 0 10px rgba(127,233,255,0.18)',
  },
  statBody: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  statLabel: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(244,236,220,0.62)',
    textTransform: 'uppercase',
  },
  statBarRow: { display: 'flex', alignItems: 'center', gap: 8 },
  statBarTrack: {
    flex: 1,
    height: 14,
    borderRadius: 999,
    background: 'rgba(5,12,28,0.95)',
    border: '1px solid rgba(127,233,255,0.45)',
    overflow: 'hidden',
    position: 'relative',
  },
  statBarFill: {
    height: '100%',
    background:
      'linear-gradient(90deg, #2563D9 0%, #2BC0E4 55%, #6EE7B7 100%)',
    boxShadow: '0 0 10px rgba(127,233,255,0.55)',
    transition: 'width 320ms cubic-bezier(.2,.8,.2,1)',
  },
  statBarValue: {
    minWidth: 38,
    textAlign: 'right',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 13,
    fontWeight: 700,
    color: BONE,
    letterSpacing: 0.5,
  },

  // ── badge row (top-right earned) ────
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    maxWidth: 200,
  },
  badgeTile: {
    width: 46,
    height: 46,
    borderRadius: 999,
    overflow: 'hidden',
    background: 'rgba(7,12,28,0.6)',
    border: '1px solid rgba(127,233,255,0.5)',
    boxShadow: '0 0 10px rgba(127,233,255,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImg: { width: '100%', height: '100%', objectFit: 'cover' },
  badgeTextOnly: {
    padding: '2px 6px',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 8,
    letterSpacing: 0.4,
    color: '#C5E5D6',
    textAlign: 'center',
    lineHeight: 1.1,
  },
  badgeEmpty: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(244,236,220,0.4)',
  },

  // ── council framed awards ────
  awardRow: {
    pointerEvents: 'none',
    display: 'flex',
    justifyContent: 'center',
    gap: 30,
    padding: '0 28px',
    marginTop: -20,
  },
  awardSlot: {
    position: 'relative',
    width: 180,
    height: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 0 14px rgba(127,233,255,0.4))',
  },
  awardFrame: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  awardBadge: {
    position: 'absolute',
    top: '18%',
    left: '20%',
    width: '60%',
    height: '60%',
    objectFit: 'contain',
    borderRadius: 999,
  },
  awardLabel: {
    position: 'absolute',
    bottom: '6%',
    left: '12%',
    right: '12%',
    textAlign: 'center',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#E9C46A',
    textTransform: 'uppercase',
    textShadow: '0 1px 0 rgba(0,0,0,0.6)',
  },

  // ── bottom narrative card ────
  bottom: {
    pointerEvents: 'auto',
    padding: '0 28px 28px',
  },
  narrativeCard: {
    background: 'rgba(7,12,28,0.82)',
    border: '1px solid rgba(127,233,255,0.28)',
    borderRadius: 14,
    padding: '22px 26px 22px',
    maxWidth: 760,
    margin: '0 auto',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    boxShadow: '0 0 24px rgba(127,233,255,0.08)',
  },
  kicker: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    letterSpacing: 1.8,
    color: CYAN,
    marginBottom: 10,
  },
  narrative: {
    fontFamily: '"Instrument Serif", serif',
    fontSize: 22,
    lineHeight: 1.4,
    margin: 0,
    color: BONE,
  },

  // ── choice buttons (pill, cyan-glow, three states) ────
  choices: {
    marginTop: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  // NORMAL — dark navy interior, cyan border + dot.
  choiceBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: '12px 18px',
    borderRadius: 999,
    border: `1.5px solid ${CYAN}`,
    background: 'linear-gradient(180deg, #0F1B3A 0%, #0A1226 100%)',
    color: CYAN,
    fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 0.4,
    textAlign: 'left',
    cursor: 'pointer',
    outline: 'none',
    boxShadow:
      '0 0 12px rgba(127,233,255,0.28), inset 0 0 14px rgba(127,233,255,0.06)',
    transition:
      'box-shadow 140ms ease, background 140ms ease, color 140ms ease, border-color 140ms ease, transform 140ms ease',
  },
  // HOVER — brighter aqua background, stronger glow.
  choiceBtnHover: {
    background:
      'linear-gradient(180deg, rgba(80,200,235,0.34) 0%, rgba(43,192,228,0.18) 100%)',
    boxShadow:
      '0 0 18px rgba(127,233,255,0.45), inset 0 0 18px rgba(127,233,255,0.18)',
    transform: 'translateY(-1px)',
  },
  // SELECTED — solid cyan fill, dark bold text, checkmark visible.
  choiceBtnSelected: {
    background: 'linear-gradient(180deg, #9EF1FF 0%, #5DDDF7 100%)',
    color: '#0A1226',
    borderColor: '#9EF1FF',
    boxShadow:
      '0 0 22px rgba(158,241,255,0.65), inset 0 0 14px rgba(255,255,255,0.4)',
  },
  choiceDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: 'transparent',
    border: `2px solid ${CYAN}`,
    boxShadow: `0 0 8px rgba(127,233,255,0.55)`,
    flexShrink: 0,
  },
  choiceDotSelected: {
    background: '#0A1226',
    border: '2px solid #0A1226',
    boxShadow: '0 0 8px rgba(10,18,38,0.55)',
  },
  choiceText: {
    flex: 1,
    color: CYAN,
    textShadow: '0 0 6px rgba(127,233,255,0.35)',
  },
  choiceTextSelected: {
    color: '#0A1226',
    textShadow: 'none',
    fontWeight: 700,
  },
  choiceCheck: {
    fontSize: 18,
    fontWeight: 800,
    color: '#0A1226',
    marginLeft: 8,
  },
  terminal: {
    marginTop: 16,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    letterSpacing: 1.4,
    color: 'rgba(244,236,220,0.55)',
    textTransform: 'uppercase',
  },
};
