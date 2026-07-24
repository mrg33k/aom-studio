#!/usr/bin/env node
// Scan the AOM-EA mission folders and emit a static registry that the
// dashboard's missions-tree endpoint reads. Lets the Working list surface
// every active mission, not just ones with a queued task in Supabase.
// Generated file: src/dashboard/data/missions-registry.json.
const fs = require('fs')
const path = require('path')

const STUDIO_ROOT = path.resolve(__dirname, '..')
// REPO_ROOT defaults to aom-studio's parent, but worktrees live deeper
// (e.g. aom-studio/.claude/worktrees/<name>) where ../.. lands inside
// .claude/worktrees with no corner/. AOM_EA_ROOT env override lets the
// caller point at the real AOM-EA checkout from any working dir.
const REPO_ROOT = process.env.AOM_EA_ROOT
  ? path.resolve(process.env.AOM_EA_ROOT)
  : path.resolve(STUDIO_ROOT, '..')
// MISSIONS_REGISTRY_OUT override (realtime contract, 2026-07-02): the launchd job
// com.aom-ea.missions-registry runs this same builder every 60s and writes to
// AOM-EA/corner/users/aom/missions/master-loop/deliverables/missions-registry-live.json, which missions-tree.js fetches
// through the RAG tunnel ahead of this deploy-baked copy — so mission renames and
// status changes reach the dashboard without a deploy.
const OUT_PATH = process.env.MISSIONS_REGISTRY_OUT
  ? path.resolve(process.env.MISSIONS_REGISTRY_OUT)
  : path.join(STUDIO_ROOT, 'src', 'dashboard', 'data', 'missions-registry.json')

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
    // Workstream passthrough: a folder under missions/ with no CONTEXT.md
    // is a grouping folder (e.g. aheadofmarket.com/missions/AOM holding
    // AOM/home, AOM/brands as flat sub-missions). Don't emit it as a
    // mission — walk its child directories directly so the real missions
    // surface. raw_slug is path-joined so leaf slugs stay unique
    // (AOM/home → 'AOM-home').
    const hasContext = fs.existsSync(path.join(dir, 'CONTEXT.md'))
    if (!hasContext) {
      let childEntries = []
      try { childEntries = fs.readdirSync(dir, { withFileTypes: true }) } catch {}
      for (const c of childEntries) {
        if (!c.isDirectory()) continue
        if (c.name === 'archive' || c.name === 'research' || c.name === 'screenshots'
            || c.name === 'deliverables' || c.name === 'concepts' || c.name.startsWith('.')) continue
        const childDir = path.join(dir, c.name)
        const childHasContext = fs.existsSync(path.join(childDir, 'CONTEXT.md'))
        if (!childHasContext) continue
        const fm = readContext(childDir)
        const status = fm.status || 'in-progress'
        const lastUpdated = fm.last_updated || null
        const workstream = fm.workstream || e.name.toLowerCase()
        const childRawBase = parentRawSlug ? `${parentRawSlug}-${e.name}` : e.name
        const rawSlug = `${childRawBase}-${c.name}`
        out.push({
          slug: `${projectSlug}:${rawSlug}`,
          raw_slug: rawSlug,
          folder_name: c.name,
          parent_raw_slug: parentRawSlug,
          depth,
          project_slug: projectSlug,
          workstream,
          name: fm.name || deriveDisplayName(c.name),
          status,
          is_done: isDoneStatus(status),
          last_updated: lastUpdated,
          path: childDir.replace(REPO_ROOT + '/', ''),
        })
        // Recurse for further nested page→section→sub-section trees.
        out.push(...scanDir(childDir, projectSlug, rawSlug, depth + 1))
      }
      continue
    }
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

// per-user WORLD-level missions: corner/users/<user>/missions/<slug>.
// project = the user/world slug ('aom:socials', 'aom:outreach', ...) — the
// same prefix convention the live agent_status truth already uses. Scanned
// LAST so these never steal an existing project's first-wins raw-slug claim;
// they only claim raws nobody else registered (one-write-path R7 depoison:
// bare 'social'/'outreach' used to have ONLY wrong-project registrants, which
// is how first-wins dragged AOM work under ambition-mechanical).
try {
  const usersDir = path.join(REPO_ROOT, 'corner', 'users')
  for (const u of fs.readdirSync(usersDir, { withFileTypes: true })) {
    if (!u.isDirectory()) continue
    missions.push(...scanDir(path.join(usersDir, u.name), u.name))
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
