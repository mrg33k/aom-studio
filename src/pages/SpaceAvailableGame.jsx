import React, { useEffect, useMemo, useRef, useState } from 'react';

import phaseGraph from './space-available-game/data/phases.json';
import rolesData from './space-available-game/data/roles.json';
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

// ─── Hub trigger phases ───────────────────────────────────────────────────────
// Hub shows before each learning module (ch1) and before each outpost design
// phase (ch2/3) — mirrors Mission Water's arrive/findings gate pattern.

const HUB_TRIGGER_PHASES = new Set([
  'sa_health_module',
  'sa_energy_module',
  'sa_cyber_module',
  'sa_life_support',
  'sa_habitat',
  'sa_food_systems',
]);

function shouldShowHub(nextPhaseId) {
  return HUB_TRIGGER_PHASES.has(nextPhaseId);
}

const PHASE_LABELS = {
  sa_health_module:  'Health & Nutrition',
  sa_energy_module:  'Energy & Environment',
  sa_cyber_module:   'Cyber-Technology',
  sa_life_support:   'Life Support',
  sa_habitat:        'Habitat Design',
  sa_food_systems:   'Food Systems',
};

function buildHubContext(nextPhaseId, history) {
  const label = PHASE_LABELS[nextPhaseId] || 'Next Module';
  const modulesCompleted = countModulesCompleted(history);
  const systemsCompleted = countSystemsCompleted(history);

  if (nextPhaseId === 'sa_health_module' || nextPhaseId === 'sa_energy_module' || nextPhaseId === 'sa_cyber_module') {
    return `Entering ${label} learning module. Briefing in progress.`;
  }
  if (nextPhaseId === 'sa_life_support') {
 return `Outpost construction begins. Designing ${label}, the crew's first lifeline.`;
  }
  if (nextPhaseId === 'sa_habitat') {
    return `${systemsCompleted} system${systemsCompleted !== 1 ? 's' : ''} complete. Designing ${label} next.`;
  }
  if (nextPhaseId === 'sa_food_systems') {
 return `${systemsCompleted} system${systemsCompleted !== 1 ? 's' : ''} complete. Final outpost system, ${label}.`;
  }
  return 'Mission checkpoint.';
}

function countModulesCompleted(history) {
  const moduleIds = ['sa_health_module', 'sa_energy_module', 'sa_cyber_module'];
  return moduleIds.filter((id) => history.includes(id)).length;
}

function countSystemsCompleted(history) {
  const systemIds = ['sa_life_support', 'sa_habitat', 'sa_food_systems'];
  return systemIds.filter((id) => history.includes(id)).length;
}

// For ManifestDrawer / HubScreen "regions" compat — reuse the 3-slot concept.
function countRegionsCompleted(history) {
  // Count learning modules OR outpost systems, whichever set is further along.
  const modules = countModulesCompleted(history);
  const systems = countSystemsCompleted(history);
  return Math.max(modules, systems);
}

/**
 * SpaceAvailableGame — Conrad Foundation interactive game
 * "SpaceAvailable: A Voyage to the Moon"
 *
 * Routes: /space-available, /spaceavailable, /SpaceAvailableGame
 *
 * Built on the Mission Water game engine. Fully playable mock for Nancy Conrad /
 * Conrad Foundation pitches. Students ages 13–18 design a sustainable lunar
 * outpost across 4 phases: Lunar Learning Portal → Build the Outpost →
 * International Collaboration → Celebration.
 */
export default function SpaceAvailableGame() {
  // Gate sequence: welcome → name → role → budget → game
  const [hasStarted, setHasStarted] = useState(false);
  const [nameEntered, setNameEntered] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [budgetConfirmed, setBudgetConfirmed] = useState(false);
  const [investigationResources, setInvestigationResources] = useState(null);

  const [runState, setRunState] = useState(() => initRunState(phaseGraph));

  // Hub gate
  const [showHub, setShowHub] = useState(false);
  const [pendingChoiceId, setPendingChoiceId] = useState(null);
  const [hubNextPhaseId, setHubNextPhaseId] = useState(null);

  // Manifest drawer
  const [showManifest, setShowManifest] = useState(false);

  // DEV deep-link: ?screen=welcome|name|role|budget|hub|game / ?phase=<phaseId>
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const q = new URLSearchParams(window.location.search);
    const screen = q.get('screen');
    const phase = q.get('phase');
    if (q.get('manifest') === '1') setShowManifest(true);
    if (!screen && !phase) return;

    const devRole = rolesData?.roles?.[0] ?? { id: 'dev', name: 'Dev' };

    if (screen === 'name') {
      setHasStarted(true);
    } else if (screen === 'role') {
      setHasStarted(true); setNameEntered(true); setPlayerName('Cadet');
    } else if (screen === 'budget') {
      setHasStarted(true); setNameEntered(true); setPlayerName('Cadet');
      setSelectedRole(devRole);
    } else if (screen === 'hub' || screen === 'game' || phase) {
      setHasStarted(true); setNameEntered(true); setPlayerName('Cadet');
      setSelectedRole(devRole);
      setBudgetConfirmed(true);
      setInvestigationResources(devRole.starting_resources ?? null);
      const devState = {
        ...initRunState(phaseGraph, devRole.starting_resources ?? null, devRole.starting_supplies ?? null),
        credits: 60,
      };
      if (screen === 'hub') {
        setShowHub(true);
        setHubNextPhaseId(phaseGraph.phases.sa_track_select ? 'sa_track_select' : phaseGraph.start_phase);
      }
      if (phase && phaseGraph.phases[phase]) {
        setRunState({ ...devState, phase_id: phase, history: [phase] });
      } else {
        setRunState(devState);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase fade
  const fadeRef = useRef(null);
  const prevPhaseIdRef = useRef(null);

  const triggerFade = () => {
    const el = fadeRef.current;
    if (!el) return;
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

  const phase = useMemo(() => getCurrentPhase(phaseGraph, runState), [runState.phase_id]);
  const hud = useMemo(() => resolveHud(phase, runState), [phase, runState]);

  const onChoose = (choiceId) => {
    let nextPhaseId = null;
    try {
      const choices = phase?.choices || [];
      const chosen = choices.find((c) => c.id === choiceId);
      if (chosen) nextPhaseId = chosen.next_phase || chosen.next_phase_id || null;
    } catch (_) {}

    if (nextPhaseId && shouldShowHub(nextPhaseId)) {
      setPendingChoiceId(choiceId);
      setHubNextPhaseId(nextPhaseId);
      setShowHub(true);
      return;
    }

    setRunState((prev) => {
      try {
        return applyChoice(phaseGraph, prev, choiceId);
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[SpaceAvailableGame] choice failed:', err.message);
        }
        return prev;
      }
    });
  };

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
          console.warn('[SpaceAvailableGame] hub continue failed:', err.message);
        }
        return prev;
      }
    });
  };

  const onHubSpend = (action) => setRunState((prev) => spendHubAction(prev, action));
  const onBuySupply = (supplyKey) => setRunState((prev) => applyPurchase(prev, supplyKey));
  const onTogglePace = () =>
    setRunState((prev) => setPace(prev, prev.pace === 'thorough' ? 'efficient' : 'thorough'));

  const onJumpToPhase = (phaseId) => {
    if (!phaseGraph.phases[phaseId]) return;
    setRunState((prev) => ({ ...prev, phase_id: phaseId, discoveries: [], history: [phaseId] }));
    setShowHub(false);
  };

  const activeChapter = phase ? (phase.chapter || 2) : 2;

  // Blippy screen key and guide text
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
 return 'Ready, Cadet? This is your launchpad to the Moon, press BEGIN MISSION.';
      case 'name':
 return 'Log your name, Cadet, the Conrad Foundation records every astronaut who signs up.';
      case 'role':
        return `Choose your specialty, ${cadet}. Every great mission needs the right crew.`;
      case 'budget':
        return 'Allocate your Mission Credits and load your supplies before we break orbit.';
      case 'hub': {
        const s = runState.supplies || {};
        if (isWeakened(runState)) {
 return 'We are running on empty, Cadet, hit the SUPPLY STORE before you push on, or the next leg costs us.';
        }
        if ((s.food ?? 5) <= 2 || (s.power ?? 5) <= 2) {
          return 'Supplies are getting thin. Restock at the SUPPLY STORE, then CONTINUE.';
        }
        const done = countRegionsCompleted(runState.history || []);
 if (done >= 2) return 'Final module ahead, use the tokens you have left, then CONTINUE.';
        if (done >= 1) return 'Tokens run out fast. Spend them where they count, then CONTINUE.';
        return 'This is your checkpoint. Pick an action card or hit CONTINUE when ready.';
      }
      case 'game':
      default:
        return 'Study your mission briefing, then make your move.';
    }
  })();

  useEffect(() => {
    const prev = document.title;
 document.title = 'SpaceAvailable, A Voyage to the Moon';
    return () => { document.title = prev; };
  }, []);

  return (
    <div style={styles.root}>
      {/* Gate: welcome */}
      {!hasStarted && (
        <WelcomeScreen onStart={() => setHasStarted(true)} />
      )}

      {/* Gate: name entry */}
      {hasStarted && !nameEntered && (
        <NameEntryScreen
          onConfirm={(name) => { setPlayerName(name); setNameEntered(true); }}
        />
      )}

      {/* Gate: role select */}
      {hasStarted && nameEntered && !selectedRole && (
        <RoleSelect
          rolesData={rolesData}
          playerName={playerName}
          onConfirm={(role) => setSelectedRole(role)}
        />
      )}

      {/* Gate: budget planning */}
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

      {/* Hub gate: between-phase action hub */}
      {budgetConfirmed && showHub && (() => {
        const regionsCompleted = countRegionsCompleted(runState.history || []);
        const hubContext = buildHubContext(hubNextPhaseId, runState.history || []);
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
      })()}

      {/* Game: canvas + HUD */}
      {budgetConfirmed && !showHub && (
        <div style={styles.canvasFrame}>
          <Canvas phase={phase} />
          <HUD
            phase={phase}
            hud={hud}
            onChoose={onChoose}
            resources={runState.investigationResources || investigationResources}
            playerName={playerName}
            missionLabel="SPACE AVAILABLE"
          />
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

      {/* Persistent Blippy — alive across every screen */}
      <Blippy screenKey={screenKey} text={blippyGuide} />

      {/* Persistent MANIFEST tab + drawer */}
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

const styles = {
  root: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    background: '#070B14',
    overflow: 'hidden',
    fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
    color: '#FFFFFF',
  },
  canvasFrame: {
    position: 'absolute',
    inset: 0,
  },
};