import React, { useEffect, useRef, useState } from 'react';

/**
 * HUD — overlays the Canvas with:
 *   • Top-left:   Chapter pill (Ch1 / Ch2 / Ch3)
 *   • Top-center: Mission stats — Water Crisis, Investigation, Discovery count
 *   • Top-right:  Discovery badges (earned)
 *   • Bottom:     Narrative card + choice buttons (semantic, keyboard nav)
 *
 * Keyboard:
 *   ↑ / ↓   move focus across choice buttons
 *   Enter   commit focused choice
 *
 * Props:
 *   phase      — current phase object
 *   hud        — resolved HUD state (water_crisis, investigation_progress, discoveries, discovery_ids, region?)
 *   onChoose   — (choiceId) => void
 */

const DISCOVERY_LABELS = {
  groundwater_hydrology: 'Groundwater Hydrology',
  social_impact: 'Social Impact',
  environmental_chemistry: 'Environmental Chemistry',
  public_health: 'Public Health',
  climate_science: 'Climate Science',
  food_water_nexus: 'Food–Water Nexus',
  lunar_water_connection: 'Lunar Water Connection',
};

export default function HUD({ phase, hud, onChoose }) {
  const [focusIdx, setFocusIdx] = useState(0);
  const btnsRef = useRef([]);
  const choices = (phase && phase.choices) || [];

  // Reset focus to first choice on phase change.
  useEffect(() => {
    setFocusIdx(0);
    const t = setTimeout(() => {
      if (btnsRef.current[0]) btnsRef.current[0].focus();
    }, 50);
    return () => clearTimeout(t);
  }, [phase && phase.id]);

  // Global key handler for ↑/↓/Enter.
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
        // Native button activation will fire; nothing extra needed unless
        // the focus drifted off — guard anyway.
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

  return (
    <div style={styles.root}>
      {/* ── TOP BAR ──────────────────────────────────────────── */}
      <div style={styles.topBar}>
        <ChapterPill chapter={phase.chapter} />
        <StatRow hud={hud} />
        <BadgeRow ids={hud.discovery_ids || []} />
      </div>

      {/* ── NARRATIVE + CHOICES ──────────────────────────────── */}
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
              {choices.map((c, idx) => (
                <button
                  key={c.id}
                  ref={(el) => (btnsRef.current[idx] = el)}
                  onClick={() => onChoose(c.id)}
                  onFocus={() => setFocusIdx(idx)}
                  style={{
                    ...styles.choiceBtn,
                    ...(focusIdx === idx ? styles.choiceBtnActive : null),
                  }}
                >
                  <span style={styles.choiceIdx}>{idx + 1}</span>
                  <span style={styles.choiceText}>{c.text}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={styles.terminal}>End of chapter — more is coming.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── subcomponents ───────────────────────────────────────────────────────────

function ChapterPill({ chapter }) {
  return (
    <div style={styles.chapterPill}>
      <span style={styles.chapterDot} />
      <span style={styles.chapterLabel}>CH {chapter || 1}</span>
    </div>
  );
}

function StatRow({ hud }) {
  if (!hud) return null;
  return (
    <div style={styles.statRow}>
      <Stat label="Water Crisis" value={hud.water_crisis} suffix="%" tone="warn" />
      <Stat label="Investigation" value={hud.investigation_progress} suffix="%" tone="info" />
      <Stat label="Discoveries" value={hud.discoveries || 0} tone="ok" />
    </div>
  );
}

function Stat({ label, value, suffix = '', tone = 'info' }) {
  const color = tone === 'warn' ? '#E76F51' : tone === 'ok' ? '#94D2BD' : '#A8C5DA';
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color }}>
        {value != null ? value : '—'}
        <span style={styles.statSuffix}>{suffix}</span>
      </div>
    </div>
  );
}

function BadgeRow({ ids }) {
  if (!ids || ids.length === 0) {
    return (
      <div style={styles.badgeRow}>
        <div style={styles.badgeEmpty}>No discoveries yet</div>
      </div>
    );
  }
  return (
    <div style={styles.badgeRow}>
      {ids.map((id) => (
        <div key={id} style={styles.badge}>
          {DISCOVERY_LABELS[id] || id}
        </div>
      ))}
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = {
  root: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    pointerEvents: 'none',  // children re-enable
    fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
    color: '#F4ECDC',
  },
  topBar: {
    pointerEvents: 'auto',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    gap: 24,
    padding: '20px 28px',
    background:
      'linear-gradient(to bottom, rgba(8,10,16,0.65) 0%, rgba(8,10,16,0) 100%)',
  },
  chapterPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    borderRadius: 999,
    background: 'rgba(244,236,220,0.08)',
    border: '1px solid rgba(244,236,220,0.18)',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
    letterSpacing: 1.4,
  },
  chapterDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: '#E76F51',
    boxShadow: '0 0 8px rgba(231,111,81,0.7)',
  },
  chapterLabel: { fontWeight: 600 },
  statRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 28,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 100,
  },
  statLabel: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(244,236,220,0.6)',
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 0.5,
    lineHeight: 1.1,
    marginTop: 2,
  },
  statSuffix: { fontSize: 14, opacity: 0.7, marginLeft: 2 },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    maxWidth: 260,
  },
  badge: {
    padding: '4px 10px',
    borderRadius: 999,
    background: 'rgba(148, 210, 189, 0.14)',
    border: '1px solid rgba(148, 210, 189, 0.35)',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#C5E5D6',
    whiteSpace: 'nowrap',
  },
  badgeEmpty: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(244,236,220,0.4)',
    textTransform: 'uppercase',
  },
  bottom: {
    pointerEvents: 'auto',
    padding: '0 28px 28px',
  },
  narrativeCard: {
    background: 'rgba(8,10,16,0.78)',
    border: '1px solid rgba(244,236,220,0.12)',
    borderRadius: 12,
    padding: '22px 24px 20px',
    maxWidth: 720,
    margin: '0 auto',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  },
  kicker: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    letterSpacing: 1.8,
    color: '#E9C46A',
    marginBottom: 10,
  },
  narrative: {
    fontFamily: '"Instrument Serif", serif',
    fontSize: 22,
    lineHeight: 1.35,
    margin: 0,
    color: '#F4ECDC',
  },
  choices: {
    marginTop: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  choiceBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: '13px 16px',
    borderRadius: 8,
    border: '1px solid rgba(244,236,220,0.22)',
    background: 'rgba(244,236,220,0.04)',
    color: '#F4ECDC',
    fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
    fontSize: 15,
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 120ms ease, border-color 120ms ease, transform 120ms ease',
    outline: 'none',
  },
  choiceBtnActive: {
    background: 'rgba(231,111,81,0.18)',
    borderColor: '#E76F51',
    transform: 'translateX(2px)',
  },
  choiceIdx: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    color: '#E9C46A',
    minWidth: 14,
  },
  choiceText: { flex: 1 },
  terminal: {
    marginTop: 16,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    letterSpacing: 1.4,
    color: 'rgba(244,236,220,0.5)',
    textTransform: 'uppercase',
  },
};
