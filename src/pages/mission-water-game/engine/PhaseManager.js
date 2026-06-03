/**
 * PhaseManager — phase progression logic for Mission Water.
 *
 * Pure functions over the phase graph defined in data/phases.json. No React,
 * no DOM, no canvas. The engine layers (Canvas, HUD) read state derived from
 * this module; MissionWaterGame.jsx owns the runtime state object.
 *
 * Phase shape (see data/phases.json):
 *   {
 *     id, chapter, title,
 *     visuals: { background, procedural, parallax_offset },
 *     hud_state: { water_crisis, investigation_progress, discoveries, region? },
 *     narrative: string,
 *     choices: [{ id, text, next_phase, discovery, tag? }]
 *   }
 *
 * Run state shape:
 *   {
 *     phase_id: string,
 *     discoveries: string[],        // unique, ordered by acquisition
 *     history: string[]             // phase_ids visited, in order
 *   }
 */

/**
 * Build the starting run state for a phase graph.
 * @param {Object} graph - The parsed phases.json object.
 * @returns {Object} initial run state
 */
export function initRunState(graph) {
  if (!graph || !graph.start_phase || !graph.phases) {
    throw new Error('PhaseManager: graph missing start_phase or phases map');
  }
  if (!graph.phases[graph.start_phase]) {
    throw new Error(`PhaseManager: start_phase "${graph.start_phase}" not in phases map`);
  }
  return {
    phase_id: graph.start_phase,
    discoveries: [],
    history: [graph.start_phase],
  };
}

/**
 * Look up the phase object for the current run state.
 * @param {Object} graph
 * @param {Object} runState
 * @returns {Object|null} the phase, or null if missing
 */
export function getCurrentPhase(graph, runState) {
  if (!graph || !runState) return null;
  return graph.phases[runState.phase_id] || null;
}

/**
 * Apply a choice from the current phase. Returns the next run state.
 * Throws if the choice does not belong to the current phase.
 * @param {Object} graph
 * @param {Object} runState
 * @param {string} choiceId
 * @returns {Object} next run state
 */
export function applyChoice(graph, runState, choiceId) {
  const phase = getCurrentPhase(graph, runState);
  if (!phase) {
    throw new Error(`PhaseManager: no current phase (${runState && runState.phase_id})`);
  }
  const choice = (phase.choices || []).find((c) => c.id === choiceId);
  if (!choice) {
    throw new Error(`PhaseManager: choice "${choiceId}" not in phase "${phase.id}"`);
  }
  const nextId = choice.next_phase;
  if (!graph.phases[nextId]) {
    throw new Error(`PhaseManager: choice "${choiceId}" points at unknown phase "${nextId}"`);
  }
  // Accept either choice.discovery (string) or choice.discoveries (array)
  // so a single choice can award multiple badges (e.g. council reveal).
  let nextDiscoveries = runState.discoveries;
  if (Array.isArray(choice.discoveries)) {
    for (const d of choice.discoveries) {
      if (d) nextDiscoveries = appendUnique(nextDiscoveries, d);
    }
  } else if (choice.discovery) {
    nextDiscoveries = appendUnique(nextDiscoveries, choice.discovery);
  }
  return {
    phase_id: nextId,
    discoveries: nextDiscoveries,
    history: [...runState.history, nextId],
  };
}

/**
 * Resolve the HUD state to display for the current phase. Phase's hud_state
 * is the displayed truth for that beat (water_crisis, investigation_progress,
 * etc.); discovery count overrides with the run-state accumulator so the
 * badge row reflects what the player actually has.
 * @param {Object} phase
 * @param {Object} runState
 * @returns {Object} merged HUD state
 */
export function resolveHud(phase, runState) {
  if (!phase) return { discoveries: 0 };
  const base = phase.hud_state || {};
  return {
    ...base,
    discoveries: runState.discoveries.length,
    discovery_ids: runState.discoveries,
  };
}

/**
 * True when the run is on a terminal phase (no choices remain).
 * @param {Object} phase
 */
export function isTerminal(phase) {
  if (!phase) return true;
  return !phase.choices || phase.choices.length === 0;
}

// ─── internal helpers ────────────────────────────────────────────────────────

function appendUnique(arr, item) {
  if (arr.indexOf(item) !== -1) return arr;
  return [...arr, item];
}
