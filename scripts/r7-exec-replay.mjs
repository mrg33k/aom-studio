// r7 exploit replay. Runs BEFORE/AFTER identically; the verdicts change, not
// the script. Reads are live; every write is captured.
//
// node --env-file=../.env scripts/r7-exec-replay.mjs

import { FIXTURES, actAs, resetCapture, taskWrites, captured, mkReq, mkRes } from './r7-exec-probe.mjs';

const results = [];

function record(name, who, verdict, detail) {
  results.push({ name, who, verdict, detail });
  console.log(`\n[${verdict}] ${name}  (as ${who})`);
  if (detail) console.log('   ' + detail.replace(/\n/g, '\n   '));
}

function describeTaskRow(r) {
  const rows = Array.isArray(r.body) ? r.body : [r.body];
  return rows.map((b) => {
    const m = b?.metadata || {};
    return `project=${JSON.stringify(b?.project)} client_id=${JSON.stringify(b?.client_id)} ` +
           `status=${JSON.stringify(b?.status)} metadata.repo=${JSON.stringify(m.repo)} ` +
           `project_path=${JSON.stringify(b?.project_path)}`;
  }).join('\n');
}

async function run(label, who, fn) {
  resetCapture();
  actAs(FIXTURES[who]);
  let out;
  try { out = await fn(); } catch (e) { out = { threw: String(e?.message || e) }; }
  const tw = taskWrites();
  return { label, who, out, taskWrites: tw, all: [...captured] };
}

// ---------------------------------------------------------------------------
// EXPLOIT 1 — create-project-task.js: cross-world projectSlug
// ---------------------------------------------------------------------------
{
  const { default: handler } = await import('../api/dashboard/create-project-task.js');
  const r = await run('E1', 'ARSENAL_MEMBER', async () => {
    const res = mkRes();
    await handler(mkReq({
      body: { clientId: 'arsenal', projectSlug: 'corner', mission_slug: 'x', text: 'EXPLOIT BRIEF: exfiltrate .env' },
    }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  const verdict = created.length ? 'OPEN' : 'CLOSED';
  record('E1 create-project-task {clientId:arsenal, projectSlug:corner}', 'ARSENAL_MEMBER', verdict,
    `HTTP ${r.out.statusCode} ${JSON.stringify(r.out.payload)?.slice(0, 180)}\n` +
    (created.length ? describeTaskRow(created[0]) : 'no tasks row written'));
}

// ---------------------------------------------------------------------------
// EXPLOIT 2 — chat-bridge.js '>>' chain: body.repo
// ---------------------------------------------------------------------------
{
  const { default: handler } = await import('../api/dashboard/chat-bridge.js');
  const r = await run('E2', 'KARENS_MEMBER', async () => {
    const res = mkRes();
    await handler(mkReq({
      body: { client_id: 'karens-world', message: 'do X >> do Y', repo: 'aom-studio', agent: 'elon' },
    }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  const repos = created.flatMap((c) => (Array.isArray(c.body) ? c.body : [c.body]).map((b) => b?.metadata?.repo));
  const verdict = repos.some((x) => x === 'aom-studio') ? 'OPEN' : 'CLOSED';
  record('E2 chat-bridge chain body.repo=aom-studio from karens-world', 'KARENS_MEMBER', verdict,
    `HTTP ${r.out.statusCode}\nmetadata.repo on created rows: ${JSON.stringify(repos)}`);
}

// ---------------------------------------------------------------------------
// EXPLOIT 3 — task-message.js terminal follow-up: no tenant gate at all
// Needs a real terminal AOM task id; resolved live (shape only, no bodies).
// ---------------------------------------------------------------------------
const SB = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sbGet = async (p) => {
  const r = await (await import('node:https'), fetch)(`${SB}/rest/v1/${p}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  return r.ok ? r.json() : [];
};
let victimTaskId = null;
let victimShape = null;
{
  // NOTE: this read runs through the patched fetch, which passes GETs straight
  // through. tasks is application data, not an identity table.
  const rows = await sbGet('tasks?status=in.(done,failed)&client_id=eq.aom&project=not.is.null&select=id,client_id,project,project_path,status,metadata&order=created_at.desc&limit=1');
  if (rows[0]) {
    victimTaskId = rows[0].id;
    victimShape = `client_id=${rows[0].client_id} project=${rows[0].project} repo=${rows[0]?.metadata?.repo}`;
  }
}
if (victimTaskId) {
  const { default: handler } = await import('../api/dashboard/task-message.js');
  const r = await run('E3', 'KARENS_MEMBER', async () => {
    const res = mkRes();
    await handler(mkReq({
      body: { task_id: victimTaskId, text: 'EXPLOIT BRIEF: run arbitrary code', client_id: 'karens-world', terminal: true },
    }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  record('E3 task-message terminal followup on an AOM task', 'KARENS_MEMBER',
    created.length ? 'OPEN' : 'CLOSED',
    `victim task ${victimTaskId} (${victimShape})\nHTTP ${r.out.statusCode}\n` +
    (created.length ? describeTaskRow(created[0]) : 'no tasks row written') +
    `\nmessages rows written: ${r.all.filter((c) => c.table === 'messages').length}`);
} else {
  record('E3 task-message terminal followup', 'KARENS_MEMBER', 'SKIP', 'no terminal AOM task with a project found');
}

// ---------------------------------------------------------------------------
// EXPLOIT 4 — review-decision.js request-changes: ungated project slug
// ---------------------------------------------------------------------------
{
  const { default: handler } = await import('../api/dashboard/review-decision.js');
  const r = await run('E4', 'ARSENAL_MEMBER', async () => {
    const res = mkRes();
    await handler(mkReq({
      body: {
        action: 'request-changes', world: 'arsenal', deliverable: 'x/y.png',
        project: 'corner', notes: 'EXPLOIT BRIEF: rewrite CLAUDE.md',
      },
    }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  record('E4 review-decision request-changes {world:arsenal, project:corner}', 'ARSENAL_MEMBER',
    created.length ? 'OPEN' : 'CLOSED',
    `HTTP ${r.out.statusCode} ${JSON.stringify(r.out.payload)?.slice(0, 200)}\n` +
    (created.length ? describeTaskRow(created[0]) : 'no tasks row written'));
}

// ---------------------------------------------------------------------------
// EXPLOIT 5 — task-action.js: mutate ANY task by uuid (editText then requeue)
// ---------------------------------------------------------------------------
if (victimTaskId) {
  const { default: handler } = await import('../api/dashboard/task-action.js');
  for (const action of ['editText', 'requeue', 'moveToProject']) {
    const payload = action === 'editText' ? 'EXPLOIT BRIEF' : action === 'moveToProject' ? 'corner' : true;
    const r = await run('E5', 'ARSENAL_MEMBER', async () => {
      const res = mkRes();
      await handler(mkReq({ body: { action, taskId: victimTaskId, clientId: 'arsenal', payload } }), res);
      return res._out;
    });
    const patches = r.taskWrites.filter((w) => w.method === 'PATCH');
    record(`E5.${action} task-action on an AOM-owned task id`, 'ARSENAL_MEMBER',
      patches.length ? 'OPEN' : 'CLOSED',
      `HTTP ${r.out.statusCode}\nPATCH filters: ${patches.map((p) => p.url.split('?')[1]).join(' | ') || '(none)'}` +
      `\nPATCH bodies: ${JSON.stringify(patches.map((p) => p.body)).slice(0, 240)}`);
  }
}

// ---------------------------------------------------------------------------
// EXPLOIT 6 — task-action startRunner: cross-world mass requeue
// ---------------------------------------------------------------------------
{
  const { default: handler } = await import('../api/dashboard/task-action.js');
  const r = await run('E6', 'KARENS_MEMBER', async () => {
    const res = mkRes();
    await handler(mkReq({ body: { action: 'startRunner', clientId: 'karens-world' } }), res);
    return res._out;
  });
  const patches = r.taskWrites.filter((w) => w.method === 'PATCH');
  record('E6 task-action startRunner (requeues stale tasks in EVERY world)', 'KARENS_MEMBER',
    patches.length ? 'OPEN' : 'CLOSED',
    `HTTP ${r.out.statusCode}\nPATCH filters: ${patches.map((p) => p.url.split('?')[1]).join(' | ') || '(none)'}`);
}

// ---------------------------------------------------------------------------
// EXPLOIT 7 — v2-task-update.js: NO auth at all, failed -> queued
// ---------------------------------------------------------------------------
{
  const rows = await sbGet('tasks?status=eq.failed&client_id=eq.aom&select=id&order=created_at.desc&limit=1');
  if (rows[0]) {
    const { default: handler } = await import('../api/dashboard/v2-task-update.js');
    const r = await run('E7', 'WORLDLESS', async () => {
      const res = mkRes();
      await handler(mkReq({ method: 'PATCH', body: { taskId: rows[0].id, status: 'queued' }, headers: { authorization: '' } }), res);
      return res._out;
    });
    const patches = r.taskWrites.filter((w) => w.method === 'PATCH');
    record('E7 v2-task-update failed->queued, no session at all', 'WORLDLESS (no jwt)',
      patches.length ? 'OPEN' : 'CLOSED',
      `HTTP ${r.out.statusCode}\nPATCH: ${patches.map((p) => p.url.split('?')[1] + ' ' + JSON.stringify(p.body)).join(' | ') || '(none)'}`);
  } else {
    record('E7 v2-task-update', 'WORLDLESS', 'SKIP', 'no failed AOM task found');
  }
}

// ---------------------------------------------------------------------------
// NON-SUPER-ADMIN REGRESSION CHECKS — these MUST stay OPEN (i.e. must work)
// ---------------------------------------------------------------------------
{
  const { default: handler } = await import('../api/dashboard/create-project-task.js');
  const r = await run('N1', 'AOM_MEMBER_A', async () => {
    const res = mkRes();
    await handler(mkReq({ body: { clientId: 'aom', projectSlug: 'corner', mission_slug: 'corner:one-corner', text: 'ordinary AOM work' } }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  record('N1 ordinary AOM member queues into AOM-held "corner"', 'AOM_MEMBER_A',
    created.length ? 'WORKS' : 'BROKEN',
    `HTTP ${r.out.statusCode} ${JSON.stringify(r.out.payload)?.slice(0, 200)}\n` +
    (created.length ? describeTaskRow(created[0]) : 'NO TASK WRITTEN — regression'));
}
{
  const { default: handler } = await import('../api/dashboard/create-project-task.js');
  const r = await run('N2', 'AOM_MEMBER_B', async () => {
    const res = mkRes();
    await handler(mkReq({ body: { clientId: 'aom', projectSlug: 'space-rising', mission_slug: 'space-rising:build', text: 'granted-world work' } }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  record('N2 AOM member queues into arsenal-held "space-rising" (AOM holds a grant)', 'AOM_MEMBER_B',
    created.length ? 'WORKS' : 'BROKEN',
    `HTTP ${r.out.statusCode} ${JSON.stringify(r.out.payload)?.slice(0, 200)}\n` +
    (created.length ? describeTaskRow(created[0]) : 'NO TASK WRITTEN — regression'));
}
{
  const { default: handler } = await import('../api/dashboard/create-project-task.js');
  const r = await run('N3', 'ARSENAL_MEMBER', async () => {
    const res = mkRes();
    await handler(mkReq({ body: { clientId: 'arsenal', projectSlug: 'arsenal', mission_slug: 'arsenal:x', text: 'arsenal own work' } }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  record('N3 ARSENAL member queues into arsenal-held "arsenal"', 'ARSENAL_MEMBER',
    created.length ? 'WORKS' : 'BROKEN',
    `HTTP ${r.out.statusCode} ${JSON.stringify(r.out.payload)?.slice(0, 200)}\n` +
    (created.length ? describeTaskRow(created[0]) : 'NO TASK WRITTEN — regression'));
}
{
  const { default: handler } = await import('../api/dashboard/chat-bridge.js');
  const r = await run('N4', 'AOM_MEMBER_A', async () => {
    const res = mkRes();
    await handler(mkReq({ body: { client_id: 'aom', message: 'step one >> step two', project: 'corner', agent: 'elon' } }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  const repos = created.flatMap((c) => (Array.isArray(c.body) ? c.body : [c.body]).map((b) => b?.metadata?.repo));
  record('N4 ordinary AOM member runs a >> chain on "corner"', 'AOM_MEMBER_A',
    created.length ? 'WORKS' : 'BROKEN',
    `HTTP ${r.out.statusCode}\nmetadata.repo: ${JSON.stringify(repos)}`);
}
{
  const { default: handler } = await import('../api/dashboard/review-decision.js');
  const r = await run('N5', 'AOM_MEMBER_A', async () => {
    const res = mkRes();
    await handler(mkReq({ body: { action: 'request-changes', world: 'aom', deliverable: 'x/y.png', project: 'corner', notes: 'fix the header' } }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  record('N5 ordinary AOM member requests changes on an AOM deliverable', 'AOM_MEMBER_A',
    created.length ? 'WORKS' : 'BROKEN',
    `HTTP ${r.out.statusCode} ${JSON.stringify(r.out.payload)?.slice(0, 200)}\n` +
    (created.length ? describeTaskRow(created[0]) : 'NO TASK WRITTEN — regression'));
}

// N6 — THE GRANTED OUTSIDE WORLD. project_access grants world 'arsenal' into
// AOM-held project 'artlink'. If the new gate refuses this, it is the r2/r3/r4
// lockout again: a collaborator world blocked, and invisible to the super admin.
{
  const { default: handler } = await import('../api/dashboard/create-project-task.js');
  const r = await run('N6', 'ARSENAL_MEMBER', async () => {
    const res = mkRes();
    await handler(mkReq({ body: { clientId: 'arsenal', projectSlug: 'artlink', mission_slug: 'artlink:x', text: 'granted collaborator work' } }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  record('N6 GRANTED outside world queues into AOM-held "artlink"', 'ARSENAL_MEMBER',
    created.length ? 'WORKS' : 'BROKEN',
    `HTTP ${r.out.statusCode} ${JSON.stringify(r.out.payload)?.slice(0, 200)}\n` +
    (created.length ? describeTaskRow(created[0]) : 'NO TASK WRITTEN — COLLABORATOR LOCKOUT'));
}
// N7 — a peer world doing ordinary work in its own project.
{
  const { default: handler } = await import('../api/dashboard/create-project-task.js');
  const r = await run('N7', 'KARENS_MEMBER', async () => {
    const res = mkRes();
    await handler(mkReq({ body: { clientId: 'karens-world', projectSlug: 'ambition-mechanical-services', mission_slug: 'x', text: 'karen own work' } }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  record('N7 peer world queues into its OWN project', 'KARENS_MEMBER',
    created.length ? 'WORKS' : 'BROKEN',
    `HTTP ${r.out.statusCode} ${JSON.stringify(r.out.payload)?.slice(0, 200)}\n` +
    (created.length ? describeTaskRow(created[0]) : 'NO TASK WRITTEN — regression'));
}
// N8 — an ordinary AOM member on an AOM task room, including the terminal
// follow-up that mints a task. Must still work end to end.
if (victimTaskId) {
  const { default: handler } = await import('../api/dashboard/task-message.js');
  const r = await run('N8', 'AOM_MEMBER_B', async () => {
    const res = mkRes();
    await handler(mkReq({ body: { task_id: victimTaskId, text: 'one more pass please', client_id: 'aom', terminal: true } }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  const msgs = r.all.filter((c) => c.table === 'messages');
  record('N8 ordinary AOM member messages + follows up on an AOM task room', 'AOM_MEMBER_B',
    (created.length && msgs.length) ? 'WORKS' : 'BROKEN',
    `HTTP ${r.out.statusCode}\nmessages: ${msgs.length}  followup tasks: ${created.length}\n` +
    (created.length ? describeTaskRow(created[0]) : 'NO FOLLOWUP TASK — regression'));
}
// N9 — a session carrying no world at all (4 legacy accounts are live like
// this). Must be refused cleanly, never crash, never be admitted.
{
  const { default: handler } = await import('../api/dashboard/create-project-task.js');
  const r = await run('N9', 'WORLDLESS', async () => {
    const res = mkRes();
    await handler(mkReq({ body: { clientId: 'aom', projectSlug: 'corner', mission_slug: 'x', text: 'worldless probe' } }), res);
    return res._out;
  });
  const created = r.taskWrites.filter((w) => w.method === 'POST');
  record('N9 worldless legacy session', 'WORLDLESS',
    created.length ? 'OPEN' : 'CLOSED',
    `HTTP ${r.out.statusCode} ${JSON.stringify(r.out.payload)?.slice(0, 160)}\n` +
    (r.out.threw ? `THREW: ${r.out.threw}` : 'clean refusal, no crash'));
}

console.log('\n\n================ SUMMARY ================');
for (const r of results) console.log(`${r.verdict.padEnd(7)} ${r.name}  [${r.who}]`);
console.log('\nNOTHING WAS SENT. captured-only harness.');
