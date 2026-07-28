// r7 over-correction simulation. For every project slug that LIVE tasks and
// messages actually use, ask the real authorizer whether the world that is
// already using it would still be admitted. A slug that flips admit->deny is a
// lockout; this is the check R2/R3/R4 shipped without.
//
// Reads only application data (tasks/messages/projects/project_access shape).
// The JWT hop is stubbed; no auth/profile table is read.
//
// node --env-file=../.env scripts/r7-scope-sim.mjs

import { FIXTURES, actAs, mkReq } from './r7-exec-probe.mjs';
import { makeProjectScopeAuthorizer } from '../api/_lib/write-message.js';
import { makeTaskProjectAuthorizer } from '../api/_lib/taskScope.js';

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sbGet = async (p) => {
  const r = await fetch(`${SB}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  return r.ok ? r.json() : [];
};

// (world, project) pairs that live TASK rows already use — the exact set a
// write-time gate could lock out.
const taskRows = await sbGet('tasks?project=not.is.null&select=client_id,project&limit=20000');
const pairs = new Map();
for (const r of taskRows) {
  const w = String(r.client_id || '').toLowerCase();
  const p = String(r.project || '').toLowerCase();
  if (!w || !p) continue;
  const k = `${w}|${p}`;
  pairs.set(k, (pairs.get(k) || 0) + 1);
}
console.log(`live (world, project) task pairs: ${pairs.size} over ${taskRows.length} rows\n`);

const WORLD_FIXTURE = {
  aom: 'AOM_MEMBER_A',
  arsenal: 'ARSENAL_MEMBER',
  'karens-world': 'KARENS_MEMBER',
};

const rows = [];
for (const [k, n] of [...pairs.entries()].sort((a, b) => b[1] - a[1])) {
  const [world, project] = k.split('|');
  const fixName = WORLD_FIXTURE[world];
  if (!fixName) { rows.push({ world, project, n, verdict: 'no-fixture', via: '-' }); continue; }
  actAs(FIXTURES[fixName]);
  const authorize = makeProjectScopeAuthorizer({ req: mkReq({}), clientId: world });
  let v;
  try { v = await authorize(project); } catch (e) { v = { ok: false, via: 'threw', reason: String(e?.message || e) }; }
  // The EXEC verdict — what actually gates a task row after r7.
  const t = await makeTaskProjectAuthorizer(authorize)(project);
  rows.push({
    world, project, n,
    verdict: v.ok ? 'ADMIT' : 'DENY', via: v.via, reason: v.reason,
    task: t.ok ? 'ADMIT' : 'DENY', taskVia: t.via, taskReason: t.reason,
  });
}

console.log('world           project                          rows   verdict  via');
console.log('-'.repeat(92));
for (const r of rows) {
  console.log(
    `${r.world.padEnd(15)} ${r.project.slice(0, 32).padEnd(32)} ${String(r.n).padStart(5)}   ` +
    `${(r.verdict || '').padEnd(8)} ${r.via || ''}`,
  );
}

const scored = rows.filter((r) => r.verdict !== 'no-fixture');
const taskDenied = scored.filter((r) => r.task === 'DENY');
console.log(`\n=== EXEC-PATH VERDICT over ${scored.length} scored live (world, project) task pairs ===`);
console.log(`ADMIT: ${scored.length - taskDenied.length}    DENY: ${taskDenied.length}`);
for (const d of taskDenied) {
  console.log(`  DENY  ${d.world} -> ${d.project} (${d.n} live rows)  [${d.taskVia}]`);
  console.log(`        ${d.taskReason}`);
}
