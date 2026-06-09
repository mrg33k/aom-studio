import React, { useEffect, useMemo, useRef, useState } from 'react';

import phaseGraph from './mission-water-game/data/phases.json';
import rolesData from './mission-water-game/data/roles.json';
import Canvas from './mission-water-game/engine/Canvas.jsx';
import HUD from './mission-water-game/engine/HUD.jsx';
import HubScreen from './mission-water-game/engine/HubScreen.jsx';
import RoleSelect from './mission-water-game/engine/RoleSelect.jsx';
import BudgetPlanning from './mission-water-game/engine/BudgetPlanning.jsx';
import WelcomeScreen from './mission-water-game/engine/WelcomeScreen.jsx';
import NameEntryScreen from './mission-water-game/engine/NameEntryScreen.jsx';
import {
  initRunState,
  getCurrentPhase,
  applyChoice,
  resolveHud,
} from './mission-water-game/engine/PhaseManager.js';

// ─── Hub logic helpers ────────────────────────────────────────────────────────

/**
 * Returns true if the hub should appear before entering nextPhaseId.
 * Hub shows only between investigation phases:
 *   - Before arrive phases (from region select)
 *   - Before findings phases (from arrive)
 * Not before council reveal, not before ch1_intro, not before ch2+.
 */
const HUB_TRIGGER_PHASES = new Set([
  'ch1_phoenix_arrive',
  'ch1_mumbai_arrive',
  'ch1_sao_paulo_arrive',
  'ch1_phoenix_findings',
  'ch1_mumbai_findings',
  'ch1_sao_paulo_findings',
]);

function shouldShowHub(nextPhaseId) {
  return HUB_TRIGGER_PHASES.has(nextPhaseId);
}

const REGION_LABELS = {
  ch1_phoenix_arrive: 'Phoenix',
  ch1_mumbai_arrive: 'Mumbai',
  ch1_sao_paulo_arrive: 'São Paulo',
  ch1_phoenix_findings: 'Phoenix',
  ch1_mumbai_findings: 'Mumbai',
  ch1_sao_paulo_findings: 'São Paulo',
};

/**
 * Build a human-readable context string for the hub header.
 * E.g. "Phoenix investigation complete. 2 regions remain."
 */
function buildHubContext(currentPhaseId, nextPhaseId, history) {
  const region = REGION_LABELS[nextPhaseId] || '';
  // Count unique arrive phases in history to determine how many are done
  const arriveIds = ['ch1_phoenix_arrive', 'ch1_mumbai_arrive', 'ch1_sao_paulo_arrive'];
  const completedArrive = arriveIds.filter((id) => history.includes(id)).length;
  const remaining = 3 - completedArrive;

  if (nextPhaseId.endsWith('_arrive')) {
    // About to arrive at a region
    if (completedArrive === 0) {
      return `Heading to ${region}. Investigation begins.`;
    }
    return `Heading to ${region}. ${remaining} region${remaining === 1 ? '' : 's'} remaining.`;
  }
  if (nextPhaseId.endsWith('_findings')) {
    // About to review findings
    return `${region} data collected. Reviewing findings.`;
  }
  return 'Investigation checkpoint.';
}

/**
 * Count how many investigation regions are fully visited (arrive phase done).
 */
function countRegionsCompleted(history) {
  const arriveIds = ['ch1_phoenix_arrive', 'ch1_mumbai_arrive', 'ch1_sao_paulo_arrive'];
  return arriveIds.filter((id) => history.includes(id)).length;
}

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
  // R7b — Welcome screen gate: welcome → name entry → role select → budget → game
  const [hasStarted, setHasStarted] = useState(false);

  // R9 — Name entry gate
  const [nameEntered, setNameEntered] = useState(false);
  const [playerName, setPlayerName] = useState('');

  // R6 — Oregon Trail gate: role select → budget planning → game
  const [selectedRole, setSelectedRole] = useState(null);
  const [budgetConfirmed, setBudgetConfirmed] = useState(false);
  const [investigationResources, setInvestigationResources] = useState(null);

  const [runState, setRunState] = useState(() => initRunState(phaseGraph));

  // R8 — Between-phase action hub
  const [showHub, setShowHub] = useState(false);
  const [pendingChoiceId, setPendingChoiceId] = useState(null);
  const [hubNextPhaseId, setHubNextPhaseId] = useState(null);
  // Ref callback so HubScreen can open the MissionKit inside HUD
  const openKitRef = useRef(null);

  // DEV-ONLY: /screens jump hook. Reads ?screen= / ?phase= to bypass the gate
  // sequence so the Screen Board can deep-link any screen. No-op in production.
  // screen=welcome|name|role|budget|hub|game ; phase=<phaseId from phases.json>
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const q = new URLSearchParams(window.location.search);
    const screen = q.get('screen');
    const phase = q.get('phase');
    if (!screen && !phase) return;

    const devRole = rolesData?.roles?.[0] ?? { id: 'dev', name: 'Dev' };

    if (screen === 'name') {
      setHasStarted(true);
    } else if (screen === 'role') {
      setHasStarted(true); setNameEntered(true); setPlayerName('Dev');
    } else if (screen === 'budget') {
      setHasStarted(true); setNameEntered(true); setPlayerName('Dev');
      setSelectedRole(devRole);
    } else if (screen === 'hub' || screen === 'game' || phase) {
      setHasStarted(true); setNameEntered(true); setPlayerName('Dev');
      setSelectedRole(devRole);
      setBudgetConfirmed(true);
      // Give downstream screens real resources to render (HUD tokens, Hub cards).
      setInvestigationResources(devRole.starting_resources ?? null);
      if (screen === 'hub') {
        setShowHub(true);
        // Hub is a between-phase interstitial; give it a valid next-phase target
        // so it renders real content instead of an empty shell.
        setHubNextPhaseId(
          phaseGraph.phases.ch1_region_select ? 'ch1_region_select' : phaseGraph.start_phase,
        );
      }
      // Mirror the game's own onJumpToPhase shape so HUD/Canvas read valid state.
      if (phase && phaseGraph.phases[phase]) {
        setRunState({ phase_id: phase, discoveries: [], history: [phase] });
      }
    }
    // screen === 'welcome' (or unrecognized) → leave gates false → Welcome shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // R10 — Phase wipe transition
  const wipeRef        = useRef(null);
  const prevPhaseIdRef = useRef(null);

  const triggerWipe = () => {
    const el = wipeRef.current;
    if (!el) return;
    // Reset bar to left edge with no transition
    el.style.transition = 'none';
    el.style.transform  = 'translateX(-100%)';
    // Double-rAF forces a repaint before re-adding the transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'transform 150ms linear';
        el.style.transform  = 'translateX(0%)';     // sweep in (left → centre)
        setTimeout(() => {
          el.style.transform = 'translateX(100%)';  // sweep out (centre → right)
        }, 150);
      });
    });
  };

  useEffect(() => {
    if (!budgetConfirmed || showHub) {
      prevPhaseIdRef.current = runState.phase_id;
      return;
    }
    if (prevPhaseIdRef.current === null) {
      prevPhaseIdRef.current = runState.phase_id;
      return;
    }
    if (runState.phase_id !== prevPhaseIdRef.current) {
      prevPhaseIdRef.current = runState.phase_id;
      triggerWipe();
    }
  }, [runState.phase_id, budgetConfirmed, showHub]);

  const phase = useMemo(
    () => getCurrentPhase(phaseGraph, runState),
    [runState.phase_id],
  );
  const hud = useMemo(() => resolveHud(phase, runState), [phase, runState]);

  // R8 — Intercept choices and gate on hub between investigation phases
  const onChoose = (choiceId) => {
    // Peek at where this choice leads before committing
    let nextPhaseId = null;
    try {
      const choices = phase?.choices || [];
      const chosen = choices.find((c) => c.id === choiceId);
      if (chosen) nextPhaseId = chosen.next_phase || chosen.next_phase_id || null;
    } catch (_) {
      // non-critical peek
    }

    if (nextPhaseId && shouldShowHub(nextPhaseId)) {
      // Gate: show hub before advancing
      setPendingChoiceId(choiceId);
      setHubNextPhaseId(nextPhaseId);
      setShowHub(true);
      return;
    }

    // No hub — apply directly
    setRunState((prev) => {
      try {
        return applyChoice(phaseGraph, prev, choiceId);
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[MissionWaterGame] choice failed:', err.message);
        }
        return prev;
      }
    });
  };

  // R8 — Called when player hits "Continue Investigation" in the hub
  const onHubContinue = () => {
    setShowHub(false);
    const choiceId = pendingChoiceId;
    setPendingChoiceId(null);
    setHubNextPhaseId(null);
    if (choiceId == null) return;
    setRunState((prev) => {
      try {
        return applyChoice(phaseGraph, prev, choiceId);
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[MissionWaterGame] hub continue failed:', err.message);
        }
        return prev;
      }
    });
  };

  // R8 — Called when player opens Mission Kit from hub
  const onHubOpenKit = () => {
    if (openKitRef.current) openKitRef.current();
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

  // ── R7b gate: welcome screen ─────────────────────────────────────
  if (!hasStarted) {
    return <WelcomeScreen onStart={() => setHasStarted(true)} />;
  }

  // ── R9 gate: name entry ──────────────────────────────────────────
  if (!nameEntered) {
    return (
      <NameEntryScreen
        onConfirm={(name) => {
          setPlayerName(name);
          setNameEntered(true);
        }}
      />
    );
  }

  // ── R6 gate: role select ─────────────────────────────────────────
  if (!selectedRole) {
    return (
      <RoleSelect
        rolesData={rolesData}
        onConfirm={(role) => setSelectedRole(role)}
      />
    );
  }

  // ── R6 gate: budget planning ─────────────────────────────────────
  if (!budgetConfirmed) {
    return (
      <BudgetPlanning
        selectedRole={selectedRole}
        rolesData={rolesData}
        onConfirm={(resources) => {
          setInvestigationResources(resources);
          setRunState(initRunState(phaseGraph, resources));
          setBudgetConfirmed(true);
        }}
        onBack={() => setSelectedRole(null)}
      />
    );
  }

  // R8 — Hub gate: show between-phase action hub
  if (showHub) {
    const regionsCompleted = countRegionsCompleted(runState.history || []);
    const hubContext = buildHubContext(runState.phase_id, hubNextPhaseId, runState.history || []);
    return (
      <HubScreen
        phaseContext={hubContext}
        currentResources={investigationResources}
        regionsCompleted={regionsCompleted}
        regionsTotal={3}
        completedPhaseIds={runState.history || []}
        onContinue={onHubContinue}
        onOpenKit={onHubOpenKit}
      />
    );
  }

  return (
    <div style={styles.root}>
      <main style={styles.gamePanel}>
        <div style={styles.canvasFrame}>
          <Canvas phase={phase} />
          <HUD
            phase={phase}
            hud={hud}
            onChoose={onChoose}
            resources={investigationResources}
            playerName={playerName}
            openKitRef={openKitRef}
          />
          {/* R10 — Phase wipe transition overlay */}
          <div
            ref={wipeRef}
            style={{
              position: 'absolute',
              inset: 0,
              background: '#000',
              pointerEvents: 'none',
              zIndex: 50,
              transform: 'translateX(-100%)',
            }}
          />
        </div>
      </main>
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: '100%',
    height: '100%',
    maxWidth: '100%',
  },
  canvasFrame: {
    position: 'absolute',
    inset: 0,
  },
  sidebar: {
    background: '#050810',
    borderLeft: `1px solid rgba(0,229,204,0.12)`,
    overflow: 'hidden',
    display: 'none',
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
