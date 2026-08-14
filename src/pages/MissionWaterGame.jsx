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
import ManifestDrawer, { ManifestTab } from './mission-water-game/engine/ManifestDrawer.jsx';
import Blippy from './mission-water-game/engine/Blippy.jsx';
import {
  initRunState,
  getCurrentPhase,
  applyChoice,
  resolveHud,
  applyPurchase,
  spendHubAction,
  setPace,
  isWeakened,
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
 * MissionWaterGame — R16 Polish: single centered layout, smooth fades,
 * no sidebar (course selection moves into HubScreen MISSION MANIFEST overlay).
 *
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

  // R18b — persistent MANIFEST drawer (supplies + credits + tokens + badges +
  // chapters), reachable from the fixed tab on EVERY screen.
  const [showManifest, setShowManifest] = useState(false);

  // DEV-ONLY: /screens jump hook. Reads ?screen= / ?phase= to bypass the gate
  // sequence so the Screen Board can deep-link any screen. No-op in production.
  // screen=welcome|name|role|budget|hub|game ; phase=<phaseId from phases.json>
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const q = new URLSearchParams(window.location.search);
    const screen = q.get('screen');
    const phase = q.get('phase');
    // ?manifest=1 — open the persistent MANIFEST drawer (composable with any screen)
    if (q.get('manifest') === '1') setShowManifest(true);
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
      // Give downstream screens real resources to render (HUD tokens, Hub cards,
      // supplies + store credits for the R18b economy).
      setInvestigationResources(devRole.starting_resources ?? null);
      const devState = {
        ...initRunState(
          phaseGraph,
          devRole.starting_resources ?? null,
          devRole.starting_supplies ?? null,
        ),
        credits: 60, // dev: enough to exercise the SUPPLY STORE
      };
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
        setRunState({ ...devState, phase_id: phase, history: [phase] });
      } else {
        setRunState(devState);
      }
    }
    // screen === 'welcome' (or unrecognized) → leave gates false → Welcome shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // R16 — Smooth fade transition (replaces the translateX wipe)
  const fadeRef = useRef(null);
  const prevPhaseIdRef = useRef(null);

  const triggerFade = () => {
    const el = fadeRef.current;
    if (!el) return;
    // Flash black overlay: fade in → hold → fade out
    el.style.transition = 'none';
    el.style.opacity = '1';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 300ms ease';
        el.style.opacity = '0';
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
      triggerFade();
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

  // R18b — hub actions actually spend now (tokens + supplies via PhaseManager)
  const onHubSpend = (action) => {
    setRunState((prev) => spendHubAction(prev, action));
  };

  // R18b — SUPPLY STORE purchase (credits → supplies)
  const onBuySupply = (supplyKey) => {
    setRunState((prev) => applyPurchase(prev, supplyKey));
  };

  // R18b — investigation pace lives in runState (drives drain + region bonus)
  const onTogglePace = () => {
    setRunState((prev) => setPace(prev, prev.pace === 'thorough' ? 'efficient' : 'thorough'));
  };

  // Jump to the intro phase of a chapter. Discoveries/history restart (each
  // chapter is a fresh run arc) but the survival economy carries over —
  // supplies, credits, tokens and pace are continuous across chapters.
  const onJumpToPhase = (phaseId) => {
    if (!phaseGraph.phases[phaseId]) return; // guard against stale ids
    setRunState((prev) => ({
      ...prev,
      phase_id: phaseId,
      discoveries: [],
      history: [phaseId],
    }));
    setShowHub(false); // Close hub if open when jumping
  };

  const activeChapter = phase ? (phase.chapter || 1) : 1;

  // ── R18c — ONE persistent Blippy, buttery mechanics ─────────────────────────
  // He never unmounts: the root owns him, screens just change which guiding
  // line he speaks. No per-screen teleports, no dock that can drop him below
  // the fold.
  const screenKey = !hasStarted ? 'welcome'
    : !nameEntered ? 'name'
    : !selectedRole ? 'role'
    : !budgetConfirmed ? 'budget'
    : showHub ? 'hub'
    : 'game';

  const blippyGuide = (() => {
    const cadet = (playerName || 'Cadet').trim();
    switch (screenKey) {
      case 'welcome':
        return 'Ready, Cadet? Pick your mission and press BEGIN.';
      case 'name':
 return 'Type your name and hit CONFIRM, the Council logs every cadet who flies.';
      case 'role':
 return `Choose your role, ${cadet}, each investigator sees the problem differently.`;
      case 'budget':
 return 'Tokens are your skills, supplies keep you alive out there. Spend every point, then hit DEPLOY MISSION.';
      case 'hub': {
        const s = runState.supplies || {};
        if (isWeakened(runState)) {
 return 'We are running on empty, Cadet, hit the SUPPLY STORE before you push on, or the next leg costs us.';
        }
        if ((s.food ?? 5) <= 2 || (s.power ?? 5) <= 2) {
          return 'Supplies are getting thin. Spend some credits at the SUPPLY STORE, then CONTINUE.';
        }
        const done = countRegionsCompleted(runState.history || []);
 if (done >= 2) return 'Final region ahead, use the tokens you have left, then CONTINUE to face the Council.';
        if (done >= 1) return 'Tokens run out fast. Spend them where they count, then hit CONTINUE INVESTIGATION.';
 return 'This is your checkpoint. Pick an action card, or hit CONTINUE INVESTIGATION when you are ready.';
      }
      case 'game':
      default:
        return 'Read the briefing, then pick your move below.';
    }
  })();

  // Mount-time: set <title> for browser tab.
  useEffect(() => {
    const prev = document.title;
 document.title = 'Mission Water, Conrad Foundation';
    return () => { document.title = prev; };
  }, []);

  // R16 — Full-bleed single-column layout. No sidebar at any stage.
  // Course selection lives in HubScreen's MISSION MANIFEST overlay.
  return (
    <div style={styles.root}>
      {/* ─── Selection gates: welcome → name → role → budget ─────── */}

      {/* R7b gate: welcome screen */}
      {!hasStarted && (
        <WelcomeScreen onStart={() => setHasStarted(true)} />
      )}

      {/* R9 gate: name entry */}
      {hasStarted && !nameEntered && (
        <NameEntryScreen
          onConfirm={(name) => {
            setPlayerName(name);
            setNameEntered(true);
          }}
        />
      )}

      {/* R6 gate: role select */}
      {hasStarted && nameEntered && !selectedRole && (
        <RoleSelect
          rolesData={rolesData}
          playerName={playerName}
          onConfirm={(role) => setSelectedRole(role)}
        />
      )}

      {/* R6 gate: budget planning (R18b: tokens + survival supplies) */}
      {hasStarted && nameEntered && selectedRole && !budgetConfirmed && (
        <BudgetPlanning
          selectedRole={selectedRole}
          rolesData={rolesData}
          onConfirm={(resources, supplies) => {
            setInvestigationResources(resources);
            setRunState(initRunState(phaseGraph, resources, supplies));
            setBudgetConfirmed(true);
          }}
          onBack={() => setSelectedRole(null)}
        />
      )}

      {/* ─── Game phase gates ──────────────────────────────────────── */}

      {/* R8 — Hub gate: show between-phase action hub */}
      {budgetConfirmed && showHub && (
        (() => {
          const regionsCompleted = countRegionsCompleted(runState.history || []);
          const hubContext = buildHubContext(runState.phase_id, hubNextPhaseId, runState.history || []);
          return (
            <HubScreen
              phaseContext={hubContext}
              currentResources={runState.investigationResources || investigationResources}
              supplies={runState.supplies || null}
              credits={runState.credits ?? 0}
              pace={runState.pace || 'thorough'}
              regionsCompleted={regionsCompleted}
              regionsTotal={3}
              completedPhaseIds={runState.history || []}
              nextPhaseId={hubNextPhaseId}
              activeChapter={activeChapter}
              onContinue={onHubContinue}
              onSpend={onHubSpend}
              onBuySupply={onBuySupply}
              onTogglePace={onTogglePace}
              onOpenManifest={() => setShowManifest(true)}
              onJumpToPhase={onJumpToPhase}
            />
          );
        })()
      )}

      {/* Game phase: canvas + HUD */}
      {budgetConfirmed && !showHub && (
        <div style={styles.canvasFrame}>
          <Canvas phase={phase} />
          <HUD
            phase={phase}
            hud={hud}
            onChoose={onChoose}
            resources={runState.investigationResources || investigationResources}
            playerName={playerName}
          />
          {/* R16 — Smooth fade transition overlay (replaces wipe) */}
          <div
            ref={fadeRef}
            style={{
              position: 'absolute',
              inset: 0,
              background: '#000',
              pointerEvents: 'none',
              zIndex: 50,
              opacity: 0,
            }}
          />
        </div>
      )}

      {/* ── R18c — ONE persistent floating Blippy, alive across every screen ── */}
      <Blippy screenKey={screenKey} text={blippyGuide} />

      {/* ── R18b — persistent MANIFEST: tab + drawer on EVERY screen ────── */}
      <ManifestTab runState={runState} onOpen={() => setShowManifest(true)} />
      {showManifest && (
        <ManifestDrawer
          runState={runState}
          activeChapter={activeChapter}
          regionsCompleted={countRegionsCompleted(runState.history || [])}
          regionsTotal={3}
          canJump={budgetConfirmed}
          onJumpToPhase={onJumpToPhase}
          preFlight={!budgetConfirmed}
          onClose={() => setShowManifest(false)}
        />
      )}
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const SPACE_DARK = '#070B14';

const styles = {
  root: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    background: SPACE_DARK,
    overflow: 'hidden',
    fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
    color: '#FFFFFF',
  },
  canvasFrame: {
    position: 'absolute',
    inset: 0,
  },
};