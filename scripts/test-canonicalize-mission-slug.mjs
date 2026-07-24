#!/usr/bin/env node
// Parity suite for the v2 mission-slug canonicalization (JS mirror).
// Same vectors as scripts/test_room_canon.py (AOM-EA) and the trigger v2
// probes — change one, change all three.
//
// Run: node aom-studio/scripts/test-canonicalize-mission-slug.mjs
import { buildSlugLookup, canonicalizeMissionSlug } from '../src/dashboard/data/canonicalize-mission-slug.js'

const REG = {
  missions: [
    { slug: 'aom:social', raw_slug: 'social' },
    { slug: 'ambition-mechanical:social-legacy', raw_slug: 'social-legacy' },
    { slug: 'aztacoboys:website', raw_slug: 'website' },
    { slug: 'space-rising:website', raw_slug: 'website' },
    { slug: 'corner:front-door', raw_slug: 'front-door' },
  ],
}

const VECTORS = [
  ['social', null, 'aom:social'],
  ['social', 'aom', 'aom:social'],
  ['website', 'space-rising', 'space-rising:website'],
  ['website', null, 'aztacoboys:website'],
  ['newmission', 'corner', 'corner:newmission'],
  ['social', 'social', 'aom:social'],
  ['space-rising:website', null, 'space-rising:website'],
  ['social:social', null, 'aom:social'],
  ['social:social', 'social', 'aom:social'],
  ['agent-work:i-need-a-sticker', null, 'agent-work:i-need-a-sticker'],
  ['mystery-slug', null, 'mystery-slug'],
  ['mystery-slug', 'not-a-project', 'mystery-slug'],
]

let passed = 0
let failed = 0
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  ok   ${name}`) }
  else { failed++; console.log(`  FAIL ${name}  ${detail}`) }
}

const lookup = buildSlugLookup(REG)
for (const [stored, proj, want] of VECTORS) {
  const got = canonicalizeMissionSlug(stored, lookup, proj)
  check(`v2 ('${stored}', proj=${proj}) -> '${want}'`, got === want, `got '${got}'`)
}

// pre-v2 lookup shape (no projects/canonicals) keeps legacy semantics
const legacyLookup = { byRaw: lookup.byRaw }
check('legacy lookup: bare+project composes unconditionally',
  canonicalizeMissionSlug('x', legacyLookup, 'anyproj') === 'anyproj:x')
check('legacy lookup: composite passthrough',
  canonicalizeMissionSlug('a:b', legacyLookup) === 'a:b')

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
