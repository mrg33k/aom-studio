#!/usr/bin/env node
// Snapshots the dashboard's Supabase tables to JSON fixtures for local dev.
//
// Usage:
//   npm run snapshot                 # dumps client_id='aom' (default)
//   npm run snapshot -- --world ben  # different world
//   npm run snapshot -- --limit 500  # cap rows per table (default 2000)
//
// Output:
//   src/dashboard/__fixtures__/YYYY-MM-DD/<table>.json
//   src/dashboard/__fixtures__/latest  -> symlink to YYYY-MM-DD
//
// The fixture-client (src/dashboard/lib/fixtureClient.js) reads from `latest/`
// when VITE_USE_FIXTURES=1 in .env.local.

// Requires `node --env-file=.env` (Node 20.6+) — wired in package.json as `npm run snapshot`.
import { createClient } from '@supabase/supabase-js'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync, rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

const URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!URL || !KEY) {
  console.error('! Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}

const world = arg('world', 'aom')
const limit = Number(arg('limit', '2000'))

// [tableName, scopeColumn|null]. scopeColumn=null means "no client_id filter" (global table).
const TABLES = [
  ['tasks', 'client_id'],
  ['messages', 'client_id'],
  ['projects', null],
  ['events', 'client_id'],
  ['project_access', null],
  ['tenant_users', null],
  ['agent_status', 'client_id'],
  ['agent_statuses', 'client_id'],
  ['agents', null],
  ['rooms', null],
  ['context_menu_items', null],
  ['section_mappings', null],
  ['task_orders', 'client_id'],
  ['task_priorities', 'client_id'],
]

const supa = createClient(URL, KEY, { auth: { persistSession: false } })

const stamp = new Date().toISOString().slice(0, 10)
const outDir = join('src/dashboard/__fixtures__', stamp)
await mkdir(outDir, { recursive: true })

console.log(`snapshot world=${world} limit=${limit} → ${outDir}`)

const index = {
  snapshot_taken_at: new Date().toISOString(),
  world,
  limit,
  tables: {},
}

for (const [table, scopeCol] of TABLES) {
  let q = supa.from(table).select('*').limit(limit)
  if (scopeCol) q = q.eq(scopeCol, world)
  const { data, error } = await q
  if (error) {
    console.error(`  ✗ ${table}: ${error.message}`)
    index.tables[table] = { error: error.message }
    await writeFile(join(outDir, `${table}.json`), '[]')
    continue
  }
  await writeFile(join(outDir, `${table}.json`), JSON.stringify(data, null, 2))
  index.tables[table] = { rows: data?.length || 0 }
  console.log(`  ✓ ${table}: ${data?.length || 0} rows`)
}

await writeFile(join(outDir, '_index.json'), JSON.stringify(index, null, 2))

const latestLink = 'src/dashboard/__fixtures__/latest'
if (existsSync(latestLink)) rmSync(latestLink, { force: true })
symlinkSync(stamp, latestLink, 'dir')

console.log(`\n✓ Done. latest → ${stamp}`)
console.log('  Set VITE_USE_FIXTURES=1 in .env.local to activate locally.')
