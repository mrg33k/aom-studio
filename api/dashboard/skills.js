// GET /api/dashboard/skills
// GET /api/dashboard/skills?agent=<slug>
// GET /api/dashboard/skills?category=<prefix>
// GET /api/dashboard/skills?tenant=<id>    (omit or 'aom' = all; other = public only)
//
// R75-b6 -- scope-aware skills catalog. Builds on /api/dashboard/recipes but
// adds tenant-gated scope filtering so non-AOM worlds can't see internal skills.
//
// Scope is derived from category at query time:
//   public   — video, audio, brand, biz, social, outreach, web, research
//   internal — corner, sys, ops, session, collab, resolve
//
// AOM tenants see everything. All other tenants see public only.

import { readFileSync } from 'fs'
import { join } from 'path'

const INTERNAL_CATEGORIES = new Set(['corner', 'sys', 'ops', 'session', 'collab', 'resolve'])
const AOM_TENANTS = new Set(['aom'])

function scopeFor(category) {
  return INTERNAL_CATEGORIES.has(category) ? 'internal' : 'public'
}

// Mirrors .claude/rules/suggest-skills.md "Agents and Their Skill Domains"
const AGENT_CATEGORIES = {
  bobby:  ['web', 'corner'],
  colton: ['web', 'corner'],
  cleo:   ['video', 'audio', 'resolve'],
  steffen:['brand'],
  tony:   ['social'],
  jacob:  ['outreach'],
  alex:   ['biz', 'research'],
  steve:  ['ops'],
  elon:   ['sys', 'ops', 'collab'],
  _all:   ['session', 'collab'],
}

function loadSkills() {
  try {
    const path = join(process.cwd(), 'src', 'data', 'skills.json')
    const raw = readFileSync(path, 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data.skills) ? data.skills : []
  } catch {
    return []
  }
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const agentRaw    = (req.query.agent    || '').toString().trim().toLowerCase()
  const categoryRaw = (req.query.category || '').toString().trim().toLowerCase()
  const tenantRaw   = (req.query.tenant   || '').toString().trim().toLowerCase()

  const isAom = !tenantRaw || AOM_TENANTS.has(tenantRaw)

  const all = loadSkills()

  // Scope gate: non-AOM tenants see public skills only
  const scoped = isAom ? all : all.filter(s => scopeFor(s.category) === 'public')

  // Agent or category filter on top of scope gate
  let filtered = scoped
  if (agentRaw) {
    const cats = new Set([
      ...(AGENT_CATEGORIES[agentRaw] || []),
      ...(AGENT_CATEGORIES._all || []),
    ])
    filtered = scoped.filter(s => cats.has(s.category))
  } else if (categoryRaw) {
    filtered = scoped.filter(s => s.category === categoryRaw)
  }

  const counts = new Map()
  for (const s of filtered) {
    const key = s.category
    if (!counts.has(key)) counts.set(key, { category: key, label: s.categoryLabel || key, count: 0 })
    counts.get(key).count += 1
  }

  res.status(200).json({
    count: filtered.length,
    recipes: filtered.map(s => ({
      name:          s.name,
      alias:         s.alias || null,
      description:   s.description,
      category:      s.category,
      categoryLabel: s.categoryLabel || s.category,
      scope:         scopeFor(s.category),
    })),
    categories: [...counts.values()].sort((a, b) => a.label.localeCompare(b.label)),
  })
}
