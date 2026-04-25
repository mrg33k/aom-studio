#!/usr/bin/env node
// Parses AOM-EA's .claude/skills/INDEX.md + local .claude/skills/INDEX.md into
// src/data/skills.json for the dashboard slash-command picker.
// Run manually when either INDEX.md changes:
//   node scripts/build-skills-index.js
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const EA_INDEX = resolve(__dirname, '../../AOM-EA/.claude/skills/INDEX.md')
const LOCAL_INDEX = resolve(__dirname, '../.claude/skills/INDEX.md')
const OUT = resolve(__dirname, '../src/data/skills.json')

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
