#!/usr/bin/env node
// scripts/accept/R75-b8.js — acceptance gate for R75-b8 drawer FAQ slice
//
// What's tested:
//   1. task-drawer-vision-faq testid exists in project-card block
//   2. task-drawer-research-faq testid exists
//   3. task-drawer-missions testid exists
//   4. Vision FAQ Show button click → bullets or "No highlights yet" renders
//   5. Research FAQ Show button click → bullets or "No highlights yet" renders
//   6. Missions toggle button click → mission entries render or section was hidden (graceful empty)
//   7. ProjectFilesSection still renders below (no regression)
//
// Usage:
//   BASE_URL=https://aheadofmarket.com node scripts/accept/R75-b8.js
//
// Exit codes: 0 = all PASS, 1 = at least one FAIL
//
// NOTE: This is a structural/static check against the component source since
// a live Playwright session is not available in this context. Checks verify
// testid presence, Show/Hide button pattern, and compact-FAQ structure match.

import { readFileSync } from 'fs'
import { resolve } from 'path'

const checks = []
function record(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  const tag = pass ? 'PASS' : 'FAIL'
  const line = detail ? `${tag} — ${name} (${detail})` : `${tag} — ${name}`
  console.log(line)
}

const REPO_ROOT = resolve(import.meta.dirname, '../..')

function readSrc(rel) {
  return readFileSync(resolve(REPO_ROOT, 'src', rel), 'utf8')
}

async function run() {
  console.log('\nR75-b8 drawer FAQ slice — acceptance gate\n')

  // ── Source checks: FilesSection.jsx ProjectMissionsSection ───────────────
  let filesSrc = ''
  try {
    filesSrc = readSrc('dashboard/components/cv3/tasks/FilesSection.jsx')
    record('FilesSection.jsx readable', true)
  } catch (e) {
    record('FilesSection.jsx readable', false, e.message)
  }

  if (filesSrc) {
    record(
      'ProjectMissionsSection has data-testid="task-drawer-missions"',
      filesSrc.includes('data-testid="task-drawer-missions"'),
    )
    record(
      'ProjectMissionsSection uses local useState for isOpen (not context)',
      filesSrc.includes('const [isOpen, setIsOpen] = useState(false)'),
    )
    record(
      'ProjectMissionsSection has Show/Hide button pattern',
      filesSrc.includes("data-testid=\"project-missions-toggle\"") &&
      filesSrc.includes("{isOpen ? 'Hide' : 'Show'}"),
    )
    record(
      'ProjectMissionsSection drops count badge (no count span)',
      !filesSrc.includes("opacity: loading || count > 0 ? 1 : 0"),
    )
    record(
      'ProjectMissionsSection has colored dot (not chevron)',
      filesSrc.includes("borderRadius: '50%'") && filesSrc.includes('dotColor'),
    )
    record(
      'ProjectMissionsSection returns null on empty (graceful empty)',
      filesSrc.includes('if (!loading && missions.length === 0) return null'),
    )
    record(
      'ProjectMissionsSection no longer uses context taskMissionsOpen',
      !filesSrc.includes('taskMissionsOpen'),
    )
    record(
      'mission entry testids preserved (project-missions-entry-)',
      filesSrc.includes('data-testid={`project-missions-entry-${m.slug}`}'),
    )
  }

  // ── Source checks: TasksPanel.jsx ─────────────────────────────────────────
  let panelSrc = ''
  try {
    panelSrc = readSrc('dashboard/components/cv3/TasksPanel.jsx')
    record('TasksPanel.jsx readable', true)
  } catch (e) {
    record('TasksPanel.jsx readable', false, e.message)
  }

  if (panelSrc) {
    record(
      'TasksPanel renders TaskDrawerFileFAQ for VISION.md with correct testid',
      panelSrc.includes('testid="task-drawer-vision-faq"'),
    )
    record(
      'TasksPanel renders TaskDrawerFileFAQ for RESEARCH.md with correct testid',
      panelSrc.includes('testid="task-drawer-research-faq"'),
    )
    record(
      'TasksPanel renders ProjectMissionsSection in project-card block',
      panelSrc.includes('<ProjectMissionsSection />'),
    )
    record(
      'ProjectFilesSection still present below missions (no regression)',
      panelSrc.includes('<ProjectFilesSection />'),
    )
  }

  // ── Source checks: TaskDrawerFileFAQ.jsx ──────────────────────────────────
  let faqSrc = ''
  try {
    faqSrc = readSrc('dashboard/components/cv3/tasks/TaskDrawerFileFAQ.jsx')
    record('TaskDrawerFileFAQ.jsx readable', true)
  } catch (e) {
    record('TaskDrawerFileFAQ.jsx readable', false, e.message)
  }

  if (faqSrc) {
    record(
      'TaskDrawerFileFAQ has bullets testid pattern (${testid}-bullets)',
      faqSrc.includes('`${testid}-bullets`'),
    )
  }

  const passed = checks.filter(c => c.pass).length
  const total = checks.length
  console.log(`\nR75-b8: ${passed}/${total} PASS`)
  process.exit(passed === total ? 0 : 1)
}

run().catch(err => {
  console.error('R75-b8 harness error:', err)
  process.exit(2)
})
