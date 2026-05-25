#!/usr/bin/env node
// Scan the AOM-EA mission folders and emit a static registry that the
// dashboard's missions-tree endpoint reads. Lets the Working list surface
// every active mission, not just ones with a queued task in Supabase.
// Generated file: src/dashboard/data/missions-registry.json.
const fs = require('fs')
const path = require('path')

const STUDIO_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(STUDIO_ROOT, '..')
const OUT_PATH = path.join(STUDIO_ROOT, 'src', 'dashboard', 'data', 'missions-registry.json')

// On Vercel the parent AOM-EA repo isn't checked out — only aom-studio.
// Skip so we don't clobber the registry that was committed locally.
if (!fs.existsSync(path.join(REPO_ROOT, 'corner'))) {
  console.log('[missions-registry] no corner/ at', REPO_ROOT, '— skipping (already-committed registry stays)')
  process.exit(0)
}

const DONE_TOKENS = ['done', 'shipped', 'archived', 'completed', 'closed', 'abandoned', 'superseded']

function isDoneStatus(s) {
  if (!s) return false
  // Mission is done only when status STARTS with a done token (the leading
  // word describes what the mission IS, not what happened inside it). A
  // status like "sdk-native-bridge-shipped-r3-soak-pending" stays in-flight
  // because the leading word is the descriptor, not "shipped".
  const lower = String(s).toLowerCase().trim()
  for (const tok of DONE_TOKENS) {
    if (lower === tok) return true
    if (lower.startsWith(tok + '-') || lower.startsWith(tok + ' ')) return true
  }
  return false
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {}
  const end = text.indexOf('\n---', 4)
  if (end === -1) return {}
  const block = text.slice(4, end)
  const out = {}
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

function readContext(dir) {
  const p = path.join(dir, 'CONTEXT.md')
  try {
    const raw = fs.readFileSync(p, 'utf8')
    const fm = parseFrontmatter(raw)
    // Fallback: parse inline markdown bold labels in the body for fields
    // missing from frontmatter. Pattern: **Workstream:** `slug` or
    // **Workstream:** slug. Same for **Status:** and **Mission slug:**.
    if (!fm.workstream) {
      const m = raw.match(/\*\*Workstream:\*\*\s*`?([a-z][a-z0-9-]*)`?/i)
      if (m) fm.workstream = m[1].toLowerCase()
    }
    return fm
  } catch { return {} }
}

function deriveDisplayName(slug) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function scanDir(parentDir, projectSlug, parentRawSlug = null, depth = 0) {
  // R-MP-2: recurse into nested <mission>/missions/<child>/ folders so
  // page → section → sub-section trees survive into the registry.
  // raw_slug becomes path-joined with '-' so it stays unique within a project
  // (home + home/missions/hero → 'home' and 'home-hero').
  const missionsDir = path.join(parentDir, 'missions')
  let entries
  try { entries = fs.readdirSync(missionsDir, { withFileTypes: true }) }
  catch { return [] }
  const out = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    if (e.name === 'archive' || e.name.startsWith('.')) continue
    const dir = path.join(missionsDir, e.name)
    const fm = readContext(dir)
    const status = fm.status || 'in-progress'
    const lastUpdated = fm.last_updated || null
    // R-MP-3 — workstream grouping (legacy flat tier). Null means
    // top-level / unsorted. The nested tree from R-MP-2 supersedes this
    // for projects that use the page → section nest, but workstream
    // grouping still works for legacy flat-mission projects.
    const workstream = fm.workstream || null
    const rawSlug = parentRawSlug ? `${parentRawSlug}-${e.name}` : e.name
    out.push({
      slug: `${projectSlug}:${rawSlug}`,
      raw_slug: rawSlug,
      folder_name: e.name,
      parent_raw_slug: parentRawSlug,
      depth,
      project_slug: projectSlug,
      workstream,
      name: fm.name || deriveDisplayName(e.name),
      status,
      is_done: isDoneStatus(status),
      last_updated: lastUpdated,
      path: dir.replace(REPO_ROOT + '/', ''),
    })
    // Recurse into this mission's own missions/<child>/ for the next tier.
    out.push(...scanDir(dir, projectSlug, rawSlug, depth + 1))
  }
  return out
}

const missions = []

// corner-internal missions (project = corner)
missions.push(...scanDir(path.join(REPO_ROOT, 'corner'), 'corner'))

// per-user, per-project missions: corner/users/<user>/projects/<project>/missions/<slug>
try {
  const usersDir = path.join(REPO_ROOT, 'corner', 'users')
  for (const u of fs.readdirSync(usersDir, { withFileTypes: true })) {
    if (!u.isDirectory()) continue
    const projectsDir = path.join(usersDir, u.name, 'projects')
    let projects
    try { projects = fs.readdirSync(projectsDir, { withFileTypes: true }) }
    catch { continue }
    for (const p of projects) {
      if (!p.isDirectory()) continue
      missions.push(...scanDir(path.join(projectsDir, p.name), p.name))
    }
  }
} catch (e) { /* no users dir */ }

// Project rollup with counts
const projectsMap = {}
for (const m of missions) {
  if (!projectsMap[m.project_slug]) {
    projectsMap[m.project_slug] = { slug: m.project_slug, total: 0, in_flight: 0, done: 0 }
  }
  projectsMap[m.project_slug].total++
  if (m.is_done) projectsMap[m.project_slug].done++
  else projectsMap[m.project_slug].in_flight++
}

const registry = {
  generated_at: new Date().toISOString(),
  missions,
  project_rollup: Object.values(projectsMap),
}
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
fs.writeFileSync(OUT_PATH, JSON.stringify(registry, null, 2))
console.log(`[missions-registry] wrote ${missions.length} missions across ${Object.keys(projectsMap).length} projects -> ${OUT_PATH}`)
