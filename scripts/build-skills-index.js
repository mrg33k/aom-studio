#!/usr/bin/env node
// Parses AOM-EA's .claude/skills/INDEX.md + local .claude/skills/INDEX.md into
// src/data/skills.json for the dashboard slash-command picker.
// Run manually when either INDEX.md changes:
//   node scripts/build-skills-index.js
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Walk up from __dirname looking for an AOM-EA root that contains
// .claude/skills/INDEX.md. Survives both layouts:
//   • pre-2026-05-14: aom-studio sibling of AOM-EA → looks like .../aom-studio/scripts → ../../AOM-EA/.claude/skills/INDEX.md
//   • post-2026-05-14: aom-studio nested in AOM-EA → looks like .../AOM-EA/aom-studio/scripts → ../../.claude/skills/INDEX.md
//   • worktrees (deeply nested under aom-studio/.claude/worktrees/<name>/scripts) → keep walking
function findEaIndex(start) {
  // The candidate we want is a `.claude/skills/INDEX.md` that lives OUTSIDE
  // the aom-studio tree (i.e., the AOM-EA parent). Walk up and skip any
  // candidate whose path includes `/aom-studio/` — those are the LOCAL_INDEX
  // copies (current dir, any worktree checkout, etc.). Also check for the
  // legacy sibling layout (`AOM-EA/.claude/...`).
  let dir = start
  for (let i = 0; i < 16; i++) {
    const candidate = resolve(dir, '.claude/skills/INDEX.md')
    if (existsSync(candidate) && !candidate.includes('/aom-studio/')) {
      return candidate
    }
    const sibling = resolve(dir, 'AOM-EA/.claude/skills/INDEX.md')
    if (existsSync(sibling)) return sibling
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }
  return null
}

const EA_INDEX = findEaIndex(__dirname)
const LOCAL_INDEX = resolve(__dirname, '../.claude/skills/INDEX.md')
const OUT = resolve(__dirname, '../src/data/skills.json')

if (!EA_INDEX) {
  console.error('build-skills-index: could not locate AOM-EA .claude/skills/INDEX.md by walking up from ' + __dirname)
  process.exit(1)
}

function parseIndex(raw) {
  const lines = raw.split('\n')
  const out = []
  let category = null
  let categoryLabel = null

  for (const line of lines) {
    const cat = line.match(/^##\s+([a-z]+)-\s*\(([^)]+)\)/)
    if (cat) {
      category = cat[1]
      categoryLabel = cat[2].trim()
      continue
    }
    // rows like: | `/skill-name` | `/alias` | description |
    const row = line.match(/^\|\s*`(\/[\w-]+)`\s*\|\s*`?([^|`]*)`?\s*\|\s*(.+?)\s*\|\s*$/)
    if (!row) continue
    if (row[1] === '/Skill') continue
    const name = row[1]
    const aliasRaw = row[2].trim()
    const alias = aliasRaw && aliasRaw !== '--' ? aliasRaw.replace(/`/g, '').trim() : null
    const desc = row[3].replace(/\s+/g, ' ').trim()
    if (desc.startsWith('---') || desc.startsWith('------')) continue
    out.push({ name, alias, description: desc, category, categoryLabel })
  }
  return out
}

const out = parseIndex(readFileSync(EA_INDEX, 'utf8'))

// Merge local INDEX (e.g. research- skills) — skip duplicates already in EA_INDEX
if (existsSync(LOCAL_INDEX)) {
  const eaNames = new Set(out.map(s => s.name))
  const local = parseIndex(readFileSync(LOCAL_INDEX, 'utf8'))
  for (const skill of local) {
    if (!eaNames.has(skill.name)) out.push(skill)
  }
}

const data = {
  generatedAt: new Date().toISOString(),
  source: '.claude/skills/INDEX.md',
  skills: out,
}

writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n')
console.log(`Wrote ${out.length} skills to ${OUT}`)
