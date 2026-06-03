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
        <SidebarPlaceholder phase={phase} />
      </aside>
    </div>
  );
}

// ─── sidebar (course placeholder) ────────────────────────────────────────────

function SidebarPlaceholder({ phase }) {
  return (
    <div style={styles.sidebarInner}>
      <div style={styles.sidebarKicker}>Mission Water</div>
      <div style={styles.sidebarTitle}>Course Selection</div>
      <p style={styles.sidebarLead}>
        Coming soon. Chapter pick, progress, and discovery wall live here.
      </p>

      <div style={styles.chapterList}>
        <ChapterRow
          n={1}
          title="Earth is running out"
          state={phase && phase.chapter === 1 ? 'active' : 'done'}
        />
        <ChapterRow n={2} title="The journey to the Moon" state="locked" />
        <ChapterRow n={3} title="The Moon holds the answer" state="locked" />
      </div>

      <div style={styles.sidebarFooter}>
        <div style={styles.footLine}>Built for Nancy Conrad.</div>
        <div style={styles.footLine}>Conrad Foundation × Ahead of Market.</div>
      </div>
    </div>
  );
}

function ChapterRow({ n, title, state }) {
  const tone =
    state === 'active' ? styles.chRowActive
    : state === 'done' ? styles.chRowDone
    : styles.chRowLocked;
  return (
    <div style={{ ...styles.chRow, ...tone }}>
      <div style={styles.chNum}>0{n}</div>
      <div style={styles.chTitle}>{title}</div>
      <div style={styles.chState}>
        {state === 'active' && '— ACTIVE'}
        {state === 'done' && '— OPEN'}
        {state === 'locked' && '— SOON'}
      </div>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = {
  root: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 7fr) minmax(280px, 3fr)',
    width: '100vw',
    height: '100vh',
    background: '#06080F',
    overflow: 'hidden',
    fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
    color: '#F4ECDC',
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
    background: '#0B0F1A',
    borderLeft: '1px solid rgba(244,236,220,0.08)',
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
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: 1.8,
    color: '#E9C46A',
    textTransform: 'uppercase',
  },
  sidebarTitle: {
    fontFamily: '"Instrument Serif", serif',
    fontSize: 28,
    lineHeight: 1.1,
    margin: 0,
  },
  sidebarLead: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: 'rgba(244,236,220,0.6)',
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
    border: '1px solid rgba(244,236,220,0.1)',
    borderRadius: 8,
    transition: 'background 120ms ease, border-color 120ms ease',
  },
  chRowActive: {
    background: 'rgba(231,111,81,0.16)',
    borderColor: 'rgba(231,111,81,0.55)',
  },
  chRowDone: {
    background: 'rgba(148,210,189,0.06)',
    borderColor: 'rgba(148,210,189,0.25)',
  },
  chRowLocked: {
    background: 'transparent',
    opacity: 0.45,
  },
  chNum: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#E9C46A',
  },
  chTitle: {
    fontFamily: '"Instrument Serif", serif',
    fontSize: 17,
    lineHeight: 1.2,
  },
  chState: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 9,
    letterSpacing: 1.4,
    color: 'rgba(244,236,220,0.55)',
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: 18,
    borderTop: '1px solid rgba(244,236,220,0.06)',
  },
  footLine: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(244,236,220,0.4)',
    lineHeight: 1.6,
  },
};
