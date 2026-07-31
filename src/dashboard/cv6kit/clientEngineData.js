import clientEngineFixture from '../data/client-engine.fixture.json';

// The live endpoint replaces only this return line when it lands.
export async function loadClientEngine() {
  return clientEngineFixture;
}

export const CLIENT_ENGINE_MISSION = 'aom:client-engine';

export const CLIENT_ENGINE_STATES = Object.freeze([
  'unknown',
  'not_started',
  'not_ready',
  'in_progress',
  'green',
]);

export function isGreenContractViolation(cell) {
  return cell?.state === 'green'
    && (cell?.evidence?.confidence !== 'verified' || !cell?.evidence?.checked_at);
}

export function validateClientEngine(engine) {
  const problems = [];
  const programs = new Map((engine?.programs || []).map((program) => [program.id, program]));

  if (!engine?.generated_at) problems.push('generated_at is missing');
  if (!Array.isArray(engine?.programs)) problems.push('programs must be an array');
  if (!Array.isArray(engine?.clients)) problems.push('clients must be an array');

  for (const client of engine?.clients || []) {
    const program = programs.get(client.program);
    if (!program) {
      problems.push(`${client.id}: unknown program ${client.program}`);
      continue;
    }
    const coverageIds = new Set((program.coverage || []).map((row) => row.id));
    const cellIds = new Set((client.cells || []).map((cell) => cell.coverage_id));
    for (const coverageId of coverageIds) {
      if (!cellIds.has(coverageId)) problems.push(`${client.id}: missing cell ${coverageId}`);
    }
    for (const cell of client.cells || []) {
      if (!coverageIds.has(cell.coverage_id)) problems.push(`${client.id}: unknown coverage ${cell.coverage_id}`);
      if (!CLIENT_ENGINE_STATES.includes(cell.state)) problems.push(`${client.id}/${cell.coverage_id}: invalid state ${cell.state}`);
      if (!['verified', 'guessed'].includes(cell.evidence?.confidence)) problems.push(`${client.id}/${cell.coverage_id}: invalid confidence`);
      // A malformed green claim must reach the cell renderer so it can be shown
      // as a contract violation. Do not reject the whole engine payload here.
      if (typeof cell.action?.dispatchable !== 'boolean') problems.push(`${client.id}/${cell.coverage_id}: dispatchable must be boolean`);
      if (cell.action?.dispatchable && !cell.action?.brief) problems.push(`${client.id}/${cell.coverage_id}: dispatchable action requires brief`);
    }
  }

  return problems;
}
