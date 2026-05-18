#!/usr/bin/env node
// backfill-missions-table.mjs — one-shot load of missions-registry.json
// into the public.missions Supabase table. Run AFTER the migration in
// supabase/migrations/20260518000000_missions_table.sql applies.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node aom-studio/scripts/backfill-missions-table.mjs [--dry-run]
//
// Idempotent: upserts on (world, slug). Safe to re-run.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REGISTRY_PATH = resolve(__dirname, '..', 'src', 'dashboard', 'data', 'missions-registry.json')
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY_RUN = process.argv.includes('--dry-run')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('backfill: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
const missions = registry.missions || []
console.log(`backfill: loading ${missions.length} missions from registry generated ${registry.generated_at}`)

// World detection: missions under aom-managed projects → world='aom'.
// Per-tenant projects (e.g. ben/...) keyed by the user folder, but the
// registry as-shipped doesn't track world — derive from project_slug
// by checking the path. Default to 'aom' if unknown.
function worldForMission(m) {
  if (!m.path) return 'aom'
  if (m.path.startsWith('corner/users/ben/')) return 'ben'
  return 'aom'
}

let processed = 0
let errors = 0
const BATCH_SIZE = 50
for (let i = 0; i < missions.length; i += BATCH_SIZE) {
  const batch = missions.slice(i, i + BATCH_SIZE).map((m, idx) => ({
    slug: m.slug,
    raw_slug: m.raw_slug,
    name: m.name,
    project_slug: m.project_slug,
    workstream_slug: m.workstream || null,
    status: m.status || 'active',
    is_done: !!m.is_done,
    last_updated: m.last_updated || null,
    world: worldForMission(m),
    sort_order: (i + idx) * 100 + 1000,
    path: m.path || null,
    metadata: {},
  }))

  if (DRY_RUN) {
    console.log(`backfill: dry-run, would upsert batch ${i}-${i + batch.length}`)
    processed += batch.length
    continue
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/missions?on_conflict=world,slug`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  })
  if (!res.ok) {
    console.error(`backfill: batch ${i} failed:`, res.status, await res.text())
    errors++
  } else {
    processed += batch.length
    console.log(`backfill: upserted batch ${i}-${i + batch.length}`)
  }
}

console.log(`backfill: done. processed=${processed} errors=${errors}`)
process.exit(errors > 0 ? 1 : 0)
