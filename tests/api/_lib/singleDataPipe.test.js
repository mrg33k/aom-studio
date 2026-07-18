// Regression guard — qa-sweep 2026-07-17 RC2: one /dashboard load ran FOUR
// useDataPipe instances (DataProvider + useCommand + useTrackerBugs +
// ActivityDock's direct useCommand call), so every poll and realtime INSERT
// handler executed 4x — live console showed 4 "Subscribing" pipes and
// active-agents fetched 17x within seconds of load.
//
// Local dev runs in fixture mode where the data layer barely boots, so a
// runtime request-count spec cannot discriminate. This test pins the WIRING
// invariant instead, which is what actually regressed:
//   - exactly one component tree owner: DataProvider owns the pipe,
//     CommandProvider hands it down as sharedPipe
//   - useCommand/useTrackerBugs disable their fallback pipe when handed one
//   - no other file in the CV6 tree may call useCommand/useTrackerBugs/
//     useDataPipe directly (they must consume the providers)
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../src/dashboard')
const read = (p) => readFileSync(join(root, p), 'utf8')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(jsx?|mjs)$/.test(name)) out.push(p)
  }
  return out
}

test('useDataPipe supports an inert enabled:false mode', () => {
  const src = read('hooks/useDataPipe.js')
  assert.ok(/options\s*=\s*\{\}/.test(src), 'useDataPipe takes an options param')
  assert.ok(/options\.enabled\s*!==\s*false/.test(src), 'enabled defaults true')
  assert.ok(/if\s*\(!enabled\)\s*return/.test(src), 'main effect gates on enabled')
})

test('CommandProvider hands the shared pipe into useCommand + useTrackerBugs', () => {
  const src = read('cv6next/providers/DataContext.jsx')
  assert.ok(/const sharedPipe = useContext\(DataContext\)/.test(src), 'provider reads the DataContext pipe')
  assert.ok(/useCommand\([^)]*sharedPipe\)/.test(src), 'useCommand receives sharedPipe')
  assert.ok(/useTrackerBugs\([^)]*sharedPipe\)/.test(src), 'useTrackerBugs receives sharedPipe')
})

test('useCommand/useTrackerBugs disable their fallback pipe when handed one', () => {
  const src = read('cv6next/data/useCommandTracker.js')
  const gated = src.match(/useDataPipe\([^)]*\{\s*enabled:\s*!sharedPipe\s*\}\)/g) || []
  assert.equal(gated.length, 2, 'both internal useDataPipe calls carry enabled:!sharedPipe')
})

test('no CV6 component owns its own pipe (the ActivityDock class of regression)', () => {
  const allowedPipeOwners = new Set([
    join(root, 'cv6next/providers/DataContext.jsx'),
    join(root, 'cv6next/data/useCommandTracker.js'),
  ])
  const offenders = []
  for (const file of walk(join(root, 'cv6next'))) {
    if (allowedPipeOwners.has(file)) continue
    const src = readFileSync(file, 'utf8')
    // Direct hook CALLS (imports of the context hooks are fine).
    if (/\buseDataPipe\s*\(/.test(src) || /\buseCommand\s*\(/.test(src) || /\buseTrackerBugs\s*\(/.test(src)) {
      offenders.push(file.slice(root.length + 1))
    }
  }
  assert.deepEqual(offenders, [], `these files must consume DataContext/CommandContext instead of owning a pipe: ${offenders.join(', ')}`)
})
