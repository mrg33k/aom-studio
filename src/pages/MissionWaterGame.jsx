import React, { useEffect, useMemo, useState } from 'react';

import phaseGraph from './mission-water-game/data/phases.json';
import Canvas from './mission-water-game/engine/Canvas.jsx';
import HUD from './mission-water-game/engine/HUD.jsx';
import {
  initRunState,
  getCurrentPhase,
  applyChoice,
  resolveHud,
} from './mission-water-game/engine/PhaseManager.js';

/**
 * MissionWaterGame — R1 Pixel Engine Scaffold.
 *
 * Two-panel container:
 *   • Left 70% — pixel canvas game + HUD overlay (Chapter 1 skeleton)
 *   • Right 30% — course sidebar placeholder (chapter/game selection comes later)
 *
 * The engine is data-driven. Swapping data/phases.json updates the game.
 * Cleo's Nano Banana imagery slots in via phase.visuals.background; until
 * that lands, the Canvas renders a procedural pixel landscape per palette.
 *
 * Mission: conrad-foundation:interactive-game
 * Route:   /MissionWaterGame, /missionwater, /mission-water-game
 */

export default function MissionWaterGame() {
  const [runState, setRunState] = useState(() => initRunState(phaseGraph));

  const phase = useMemo(
    () => getCurrentPhase(phaseGraph, runState),
    [runState.phase_id],
  );
  const hud = useMemo(() => resolveHud(phase, runState), [phase, runState]);

  const onChoose = (choiceId) => {
    setRunState((prev) => {
      try {
        return applyChoice(phaseGraph, prev, choiceId);
      } catch (err) {
        // Defensive: if data is malformed we don't want to wedge the game.
        // Log once and stay on the current phase.
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[MissionWaterGame] choice failed:', err.message);
        }
        return prev;
      }
    });
  };

  // Jump to the intro phase of a chapter. Resets run state so discoveries
  // restart — this is intentional: each chapter is a fresh run arc.
  const onJumpToPhase = (phaseId) => {
    if (!phaseGraph.phases[phaseId]) return; // guard against stale ids
    setRunState({
      phase_id: phaseId,
      discoveries: [],
      history: [phaseId],
    });
  };

  const activeChapter = phase ? (phase.chapter || 1) : 1;

  // Mount-time: set <title> for browser tab.
  useEffect(() => {
    const prev = document.title;
    document.title = 'Mission Water — Conrad Foundation';
    return () => { document.title = prev; };
  }, []);

  return (
    <div style={styles.root}>
      <main style={styles.gamePanel}>
        <div style={styles.canvasFrame}>
          <Canvas phase={phase} />
          <HUD phase={phase} hud={hud} onChoose={onChoose} />
        </div>
      </main>
      <aside style={styles.sidebar}>
        <SidebarPlaceholder phase={phase} activeChapter={activeChapter} onJumpToPhase={onJumpToPhase} />
      </aside>
    </div>
  );
}

// ─── sidebar (course placeholder) ────────────────────────────────────────────

function SidebarPlaceholder({ phase, activeChapter, onJumpToPhase }) {
  return (
    <div style={styles.sidebarInner}>
      <div style={styles.sidebarKicker}>Mission Water</div>
      <div style={styles.sidebarTitle}>Course Selection</div>
      <p style={styles.sidebarLead}>
        Select a chapter to begin. Complete each to unlock the next.
      </p>

      <div style={styles.chapterList}>
        <ChapterRow
          n={1}
          title="Earth is running out"
          state={activeChapter === 1 ? 'active' : 'done'}
          onJump={() => onJumpToPhase('ch1_intro')}
        />
        <ChapterRow
          n={2}
          title="The journey to the Moon"
          state={activeChapter === 2 ? 'active' : 'available'}
          onJump={() => onJumpToPhase('ch2_intro')}
        />
        <ChapterRow n={3} title="The Moon holds the answer" state="locked" />
      </div>

      <div style={styles.sidebarFooter}>
        <div style={styles.footLine}>Built for Nancy Conrad.</div>
        <div style={styles.footLine}>Conrad Foundation × Ahead of Market.</div>
      </div>
    </div>
  );
}

function ChapterRow({ n, title, state, onJump }) {
  const isClickable = state !== 'locked' && typeof onJump === 'function';
  const tone =
    state === 'active' ? styles.chRowActive
    : state === 'done' ? styles.chRowDone
    : state === 'available' ? styles.chRowAvailable
    : styles.chRowLocked;

  const handleKeyDown = (e) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onJump();
    }
  };

  return (
    <div
      style={{
        ...styles.chRow,
        ...tone,
        cursor: isClickable ? 'pointer' : 'default',
      }}
      onClick={isClickable ? onJump : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      aria-label={isClickable ? `Go to Chapter ${n}: ${title}` : undefined}
    >
      <div style={styles.chNum}>0{n}</div>
      <div style={styles.chTitle}>{title}</div>
      <div style={styles.chState}>
        {state === 'active' && '— ACTIVE'}
        {state === 'done' && '— REPLAY'}
        {state === 'available' && '— START'}
        {state === 'locked' && '— SOON'}
      </div>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

// ─── NASA space palette ───────────────────────────────────────────────────────
const CYAN  = '#00E5CC';
const AMBER = '#FFB703';
const SPACE_DARK  = '#070B14';
const PANEL_BG    = '#0A1628';
const TEXT_SOFT   = '#C8D8F0';

const styles = {
  root: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 7fr) minmax(280px, 3fr)',
    width: '100vw',
    height: '100vh',
    background: SPACE_DARK,
    overflow: 'hidden',
    fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
    color: '#FFFFFF',
  },
  gamePanel: {
    position: 'relative',
    overflow: 'hidden',
  },
  canvasFrame: {
    position: 'absolute',
    inset: 0,
  },
  sidebar: {
    background: '#050810',
    borderLeft: `1px solid rgba(0,229,204,0.12)`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarInner: {
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    height: '100%',
  },
  sidebarKicker: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    letterSpacing: '0.28em',
    color: CYAN,
    textTransform: 'uppercase',
  },
  sidebarTitle: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.15,
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#FFFFFF',
  },
  sidebarLead: {
    margin: 0,
    fontSize: 14,
    fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
    lineHeight: 1.5,
    color: TEXT_SOFT,
  },
  chapterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  chRow: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'baseline',
    gap: 10,
    padding: '12px 14px',
    border: `1px solid rgba(0,229,204,0.12)`,
    borderRadius: 4,
    transition: 'background 120ms ease, border-color 120ms ease',
  },
  chRowActive: {
    background: 'rgba(0,229,204,0.10)',
    borderColor: 'rgba(0,229,204,0.55)',
  },
  chRowDone: {
    background: 'rgba(0,229,204,0.04)',
    borderColor: 'rgba(0,229,204,0.20)',
  },
  chRowAvailable: {
    background: 'rgba(255,183,3,0.08)',
    borderColor: 'rgba(255,183,3,0.45)',
  },
  chRowLocked: {
    background: 'transparent',
    opacity: 0.40,
  },
  chNum: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 11,
    letterSpacing: '0.18em',
    color: AMBER,
  },
  chTitle: {
    fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.2,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  chState: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    letterSpacing: '0.2em',
    color: TEXT_SOFT,
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: 18,
    borderTop: `1px solid rgba(0,229,204,0.08)`,
  },
  footLine: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    letterSpacing: '0.15em',
    color: 'rgba(200,216,240,0.4)',
    lineHeight: 1.7,
    textTransform: 'uppercase',
  },
};
