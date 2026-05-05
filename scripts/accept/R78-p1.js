#!/usr/bin/env node
// scripts/accept/R78-p1.js — gate for R78-p1 (project-from-chat trigger heuristic + agent prompt).
//
// What's tested:
//   1. ea-system-prompt.js accepts `projects` param in buildEaSystemPrompt.
//   2. When projects are provided, ACTIVE PROJECTS section appears with slug+name lines.
//   3. When projects are provided, NOVEL TOPIC ROUTING section appears with correct instructions.
//   4. When no projects provided, neither section appears (backward-compat).
//   5. Novel-topic routing does NOT suggest a project when projects list is empty.
//   6. Handler fetches projects from Supabase with is_active=eq.true scoped to client_id.
//
// Usage:
//   node scripts/accept/R78-p1.js
//
// Exit codes: 0 = all PASS, 1 = at least one check FAILED.

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { buildEaSystemPrompt } from '../../api/dashboard/ea-system-prompt.js'

const checks = []
function record(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  const tag = pass ? 'PASS' : 'FAIL'
  console.log(detail ? `${tag} — ${name} (${detail})` : `${tag} — ${name}`)
}

// ── Static code-presence checks ───────────────────────────────────────────────

function staticChecks() {
  const src = readFileSync(
    resolve(process.cwd(), 'api/dashboard/ea-system-prompt.js'), 'utf8'
  )

  record(
    'buildEaSystemPrompt accepts projects param',
    src.includes('{ displayName, workspaceName, lastNudgeAt, projects }'),
  )
  record(
    'Handler fetches projects with is_active=eq.true',
    src.includes('is_active=eq.true'),
  )
  record(
    'Projects query scoped to client_id',
    src.includes('client_id=eq.${encodeURIComponent(clientId)}') &&
    src.includes('select=slug,name'),
  )
  record(
    'Handler uses Promise.all for parallel EA + projects fetch',
    src.includes('Promise.all'),
  )
  record(
    'ACTIVE PROJECTS section in prompt builder',
    src.includes('# ACTIVE PROJECTS'),
  )
  record(
    'NOVEL TOPIC ROUTING section in prompt builder',
    src.includes('# NOVEL TOPIC ROUTING'),
  )
  record(
    'Novel-topic routing guards against suggesting project for existing topics',
    src.includes('Do NOT suggest creating a project'),
  )
  record(
    'Novel-topic routing instructs natural offer phrasing',
    src.includes('just a one-off'),
  )
  record(
    'Novel-topic routing forbids silent scaffolding',
    src.includes('Never scaffold silently'),
  )
  record(
    'Projects fetch failure is handled gracefully (fallback to [])',
    src.includes('projectsRes.ok ? await projectsRes.json() : []'),
  )
}

// ── Unit checks against buildEaSystemPrompt ──────────────────────────────────

function unitChecks() {
  const base = { displayName: null, workspaceName: 'AOM', lastNudgeAt: new Date().toISOString() }

  // No projects → no project sections
  const noProjectsPrompt = buildEaSystemPrompt({ ...base, projects: [] })
  record(
    'Prompt without projects: no ACTIVE PROJECTS section',
    !noProjectsPrompt.includes('# ACTIVE PROJECTS'),
  )
  record(
    'Prompt without projects: no NOVEL TOPIC ROUTING section',
    !noProjectsPrompt.includes('# NOVEL TOPIC ROUTING'),
  )

  // Undefined projects → same as empty (backward-compat)
  const undefinedProjectsPrompt = buildEaSystemPrompt({ ...base })
  record(
    'Prompt with undefined projects: no ACTIVE PROJECTS section',
    !undefinedProjectsPrompt.includes('# ACTIVE PROJECTS'),
  )

  // With projects → both sections present
  const projects = [
    { slug: 'poker', name: 'Poker Strategy' },
    { slug: 'arsenal-directory', name: 'Arsenal Directory' },
  ]
  const withProjectsPrompt = buildEaSystemPrompt({ ...base, projects })

  record(
    'Prompt with projects: ACTIVE PROJECTS section present',
    withProjectsPrompt.includes('# ACTIVE PROJECTS'),
  )
  record(
    'Prompt with projects: NOVEL TOPIC ROUTING section present',
    withProjectsPrompt.includes('# NOVEL TOPIC ROUTING'),
  )
  record(
    'Prompt with projects: slug listed',
    withProjectsPrompt.includes('- poker (Poker Strategy)'),
  )
  record(
    'Prompt with projects: second project listed',
    withProjectsPrompt.includes('- arsenal-directory (Arsenal Directory)'),
  )

  // Slug == name → only slug shown, no parenthetical duplicate
  const sameSlugName = [{ slug: 'poker', name: 'poker' }]
  const sameNamePrompt = buildEaSystemPrompt({ ...base, projects: sameSlugName })
  record(
    'Slug same as name: no redundant parenthetical',
    sameNamePrompt.includes('- poker\n') && !sameNamePrompt.includes('- poker (poker)'),
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

function run() {
  staticChecks()
  unitChecks()

  const failed = checks.filter(c => !c.pass)
  console.log(`\n${checks.length - failed.length}/${checks.length} PASS`)
  if (failed.length > 0) {
    console.log('FAILED:')
    for (const c of failed) console.log(`  — ${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  }
  process.exit(failed.length > 0 ? 1 : 0)
}

run()
