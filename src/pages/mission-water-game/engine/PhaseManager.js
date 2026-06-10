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
 * Run state shape (R18b adds the survival economy):
 *   {
 *     phase_id: string,
 *     discoveries: string[],        // unique, ordered by acquisition
 *     history: string[],            // phase_ids visited, in order
 *     investigationResources: {},   // skill tokens (sampling_kits, ...)
 *     supplies: {},                 // survival supplies (food, power, spare_parts, tools)
 *     credits: number,              // Mission Credits — earned by progress, spent in the store
 *     pace: 'thorough'|'efficient'  // investigation pace — drives drain + bonus
 *   }
 */

// ─── R18b supply economy definitions ─────────────────────────────────────────
//
// Oregon Trail teeth: supplies drain as the mission advances, credits are
// earned by doing good investigation work, and the hub SUPPLY STORE converts
// credits back into supplies. Tokens (investigationResources) stay the SKILL
// currency — set at deployment, spent on hub actions and choice costs.

export const SUPPLY_DEFS = [
  { key: 'food',        label: 'FOOD',        price: 5, short: 'FOOD' },
  { key: 'power',       label: 'POWER',       price: 5, short: 'PWR'  },
  { key: 'spare_parts', label: 'SPARE PARTS', price: 8, short: 'PARTS' },
  { key: 'tools',       label: 'TOOLS',       price: 8, short: 'TOOLS' },
];

export const SUPPLY_MAX = 10;

export const CREDIT_RULES = {
  region_complete: 20,   // first entry into a region's _findings phase
  thorough_bonus: 5,     // extra per region when pace is thorough
  discovery: 10,         // per new discovery badge
};

const DEFAULT_SUPPLIES = { food: 4, power: 4, spare_parts: 4, tools: 4 };

function clampSupply(v) {
  return Math.max(0, Math.min(SUPPLY_MAX, v));
}

/**
 * True when survival supplies have run dry (food or power at 0).
 * Soft consequence only — never a game over: region credits are halved and
 * the HUD/Blippy warn the cadet to restock at the hub SUPPLY STORE.
 */
export function isWeakened(runState) {
  const s = runState && runState.supplies;
  if (!s) return false;
  return (s.food ?? 1) <= 0 || (s.power ?? 1) <= 0;
}

/**
 * Build the starting run state for a phase graph.
 * @param {Object} graph - The parsed phases.json object.
 * @param {Object} [investigationResources] - Optional starting tokens from budget planning.
 * @param {Object} [supplies] - Optional starting supplies from the supply loadout.
 * @returns {Object} initial run state
 */
export function initRunState(graph, investigationResources, supplies) {
  if (!graph || !graph.start_phase || !graph.phases) {
    throw new Error('PhaseManager: graph missing start_phase or phases map');
  }
  if (!graph.phases[graph.start_phase]) {
    throw new Error(`PhaseManager: start_phase "${graph.start_phase}" not in phases map`);
  }
  const startSupplies = { ...DEFAULT_SUPPLIES, ...(supplies || {}) };
  Object.keys(startSupplies).forEach((k) => { startSupplies[k] = clampSupply(startSupplies[k]); });
  return {
    phase_id: graph.start_phase,
    discoveries: [],
    history: [graph.start_phase],
    investigationResources: investigationResources || null,
    supplies: startSupplies,
    credits: 0,
    pace: 'thorough',
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

  // Decrement resources if the choice has a cost.
  // We never block the choice — low resources just show a warning indicator.
  let nextResources = runState.investigationResources;
  if (nextResources && choice.resource_cost) {
    const { type, amount } = choice.resource_cost;
    if (type && amount && nextResources[type] !== undefined) {
      const newVal = Math.max(0, nextResources[type] - amount);
      nextResources = { ...nextResources, [type]: newVal };
    }
  }

  // ── R18b survival economy ──────────────────────────────────────────────────
  const pace = runState.pace || 'thorough';
  const wasWeakened = isWeakened(runState);

  // Supply drain: every advance eats food + power; thorough pace eats one
  // EXTRA food at site-analysis (findings) steps — deep analysis takes longer.
  // Traveling to a new region wears the vehicle (spare parts). Balance note:
  // tuned so a fresh loadout reaches the first hub LOW but not empty — the
  // store visit is a choice the game teaches, not a punishment at step one.
  let nextSupplies = runState.supplies || { ...DEFAULT_SUPPLIES };
  const foodDrain = (pace === 'thorough' && nextId.endsWith('_findings')) ? 2 : 1;
  const travelDrain = nextId.endsWith('_arrive') ? 1 : 0;
  nextSupplies = {
    ...nextSupplies,
    food: clampSupply((nextSupplies.food ?? 0) - foodDrain),
    power: clampSupply((nextSupplies.power ?? 0) - 1),
    spare_parts: clampSupply((nextSupplies.spare_parts ?? 0) - travelDrain),
  };

  // Credits earned: new discoveries + first completion of a region's findings.
  let nextCredits = runState.credits ?? 0;
  const newDiscoveryCount = nextDiscoveries.length - runState.discoveries.length;
  if (newDiscoveryCount > 0) {
    nextCredits += newDiscoveryCount * CREDIT_RULES.discovery;
  }
  if (nextId.endsWith('_findings') && !runState.history.includes(nextId)) {
    let regionAward = CREDIT_RULES.region_complete;
    if (pace === 'thorough') regionAward += CREDIT_RULES.thorough_bonus;
    if (wasWeakened) regionAward = Math.floor(regionAward / 2); // running on empty halves the payout
    nextCredits += regionAward;
  }

  return {
    ...runState,
    phase_id: nextId,
    discoveries: nextDiscoveries,
    history: [...runState.history, nextId],
    investigationResources: nextResources,
    supplies: nextSupplies,
    credits: nextCredits,
    pace,
  };
}

/**
 * Buy one unit of a supply from the hub SUPPLY STORE.
 * Returns a new run state, or the SAME state if the purchase can't happen
 * (not enough credits / supply already full / unknown key).
 */
export function applyPurchase(runState, supplyKey) {
  const def = SUPPLY_DEFS.find((d) => d.key === supplyKey);
  if (!def || !runState || !runState.supplies) return runState;
  const current = runState.supplies[supplyKey] ?? 0;
  const credits = runState.credits ?? 0;
  if (credits < def.price || current >= SUPPLY_MAX) return runState;
  return {
    ...runState,
    credits: credits - def.price,
    supplies: { ...runState.supplies, [supplyKey]: clampSupply(current + 1) },
  };
}

/**
 * Spend resources on a hub action. Returns a new run state, or the SAME
 * state if the cadet can't afford it.
 *   'field_interview' — 1 community partnership token
 *   'lab_analysis'    — 1 sampling kit token + 1 TOOLS supply
 */
export function spendHubAction(runState, action) {
  if (!runState) return runState;
  const tokens = runState.investigationResources || {};
  const supplies = runState.supplies || {};
  if (action === 'field_interview') {
    if ((tokens.community_partnerships ?? 0) <= 0) return runState;
    return {
      ...runState,
      investigationResources: {
        ...tokens,
        community_partnerships: tokens.community_partnerships - 1,
      },
    };
  }
  if (action === 'lab_analysis') {
    if ((tokens.sampling_kits ?? 0) <= 0 || (supplies.tools ?? 0) <= 0) return runState;
    return {
      ...runState,
      investigationResources: { ...tokens, sampling_kits: tokens.sampling_kits - 1 },
      supplies: { ...supplies, tools: supplies.tools - 1 },
    };
  }
  return runState;
}

/**
 * Switch investigation pace ('thorough' | 'efficient').
 * Thorough: +1 extra food drain per phase, +5 bonus credits per region.
 */
export function setPace(runState, pace) {
  if (!runState || (pace !== 'thorough' && pace !== 'efficient')) return runState;
  return { ...runState, pace };
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
    chapter: phase.chapter || 1,
    discoveries: runState.discoveries.length,
    discovery_ids: runState.discoveries,
    investigationResources: runState.investigationResources || null,
    supplies: runState.supplies || null,
    credits: runState.credits ?? 0,
    weakened: isWeakened(runState),
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
