// api/_lib/taskScope.js — THE project-scope gate for anything that becomes
// EXECUTION. r7 cross-world-execution (2026-07-27).
//
// WHY THIS FILE EXISTS, AND WHY IT IS NOT A SECOND AUTHORIZATION MODEL.
//
// r4/r5 closed the WRITE side: a message may only carry a project slug its
// author's world can reach (makeProjectScopeAuthorizer in write-message.js).
// Nothing closed the EXECUTE side. A `tasks` row is not a chat row:
//
//     tasks.project      -> scripts/task-runner.sh normalize_repo()
//     tasks.metadata.repo -> resolve_repo_path()  -> a checkout on Patrik's Mac
//     tasks.project_path  -> used verbatim as the working directory
//     tasks.text          -> handed to a fresh Claude Code sub-agent AS ITS BRIEF
//
// So an unchecked slug on a task row is not "a message filed in the wrong
// room". It is `cd <someone else's repo>` plus an attacker-authored brief, run
// with --dangerously-skip-permissions. VERIFIED live 2026-07-27: projects row
// `corner` is held by world 'aom' and its repo_path is AOM's aom-studio
// checkout, and create-project-task.js would hand that path to a caller whose
// only claim was verifyTenant() on their OWN world.
//
// THE DECISION IS STILL verifyProjectAccess(), reached through the SAME
// makeProjectScopeAuthorizer every message writer uses. This module adds ONE
// rule on top and subtracts nothing:
//
//   first-claim does not authorize a CHECKOUT.
//
// The first-claim arm admits a slug that has no projects row AND not one
// message anywhere. It is trust-on-first-use, and write-message.js says so in
// its own comment ("a foreign world can still claim a slug that has a folder on
// disk but has never been spoken in"). For a chat tag that residual is
// acceptable — the cost is a message in the wrong room. For a task it is not:
// task-runner.sh resolve_repo_path() SNIFFS DISK, routing any slug matching
// corner/users/<world>/projects/<slug> or .../missions/<slug> to the AOM-EA
// root. A never-spoken AOM folder name is therefore a live, reachable checkout
// that first-claim would hand to any world that guessed it.
//
// MEASURED COST OF THAT ONE SUBTRACTION, over all 966 live task rows carrying a
// project (35 distinct (world, project) pairs, 2026-07-27):
//   admitted, unchanged ................................................. 33
//   admitted ONLY via first-claim ........................ 1  (aom -> aom-site)
//   refused by the canonical model itself ................ 1  (aom -> sourcing)
// The second is not this file's doing: 'sourcing' is arsenal-held and AOM holds
// no project_access grant, so verifyProjectAccess already 403s AOM on every
// OTHER sourcing surface. Task creation was the one door that never asked. The
// remedy is a project_access grant (api/dashboard/project-invite.js), which is
// the supported mechanism — not a special case here.
//
// FAILURE MODE, deliberately DIFFERENT from write-message.js. That file DROPS a
// denied tag and writes the message anyway, because a chat send must never
// vanish. A task must not degrade that way: a task stripped of its project
// still runs, and "runs somewhere else" is the vulnerability, not the fix. So
// callers on the execution path REFUSE (403). Callers that are only recording a
// message reuse the writer's drop policy. One verdict, each surface applying
// the policy it already had.

import { makeProjectScopeAuthorizer } from './write-message.js';

// Wrap an EXISTING per-request authorizer (e.g. chat-bridge's memoized one) so
// a single request pays for the Supabase round trips once.
export function makeTaskProjectAuthorizer(authorizeProjectScope) {
  return async function authorizeTaskProject(projectSlug) {
    const slug = String(projectSlug || '').trim();
    // No slug is not a denial — the caller decides whether a repo-less task is
    // acceptable. It IS how a denied slug reaches the runner as "no repo", and
    // task-runner.sh fails that row loudly rather than guessing a checkout.
    if (!slug) return { ok: true, via: 'no-scope' };
    if (typeof authorizeProjectScope !== 'function') {
      // Loud, and fail CLOSED. An ungated authorizer on this path is the whole
      // vulnerability; silently defaulting is how it survived six rounds.
      console.warn(`[taskScope] no authorizer supplied for project "${slug}" — refusing`);
      return { ok: false, via: 'unwired', reason: 'no project scope authorizer wired' };
    }
    let verdict;
    try {
      verdict = await authorizeProjectScope(slug);
    } catch (e) {
      return { ok: false, via: 'error', reason: String((e && e.message) || e) };
    }
    if (!verdict || !verdict.ok) {
      return {
        ok: false,
        via: (verdict && verdict.via) || 'denied',
        reason: (verdict && verdict.reason) || 'not reachable from this world',
      };
    }
    if (verdict.via === 'first-claim') {
      return {
        ok: false,
        via: 'first-claim-not-a-checkout',
        reason:
          `project "${slug}" has no projects row and no traffic, so nothing proves whose checkout it is. ` +
          `A first-claim admits a chat tag, never a working directory. Register the project ` +
          `(create-project-from-chat) before queueing work under it.`,
      };
    }
    return { ok: true, via: verdict.via };
  };
}

// Convenience for endpoints that don't already hold an authorizer. `clientId`
// MUST be the tenant verifyTenant already returned — never a raw body field.
export async function authorizeTaskProject({ req, clientId, projectSlug }) {
  return makeTaskProjectAuthorizer(makeProjectScopeAuthorizer({ req, clientId }))(projectSlug);
}

// One sentence every refusing endpoint returns, so a human reads the same
// message wherever they hit it.
export function taskScopeDenialMessage({ clientId, projectSlug, reason }) {
  return (
    `forbidden: world "${clientId}" may not queue work under project "${projectSlug}" — ${reason}. ` +
    `A queued task runs a brief inside that project's checkout, so the project must be one this world already reaches.`
  );
}
