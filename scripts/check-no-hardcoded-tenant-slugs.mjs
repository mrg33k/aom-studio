import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['src', 'api']
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx'])
const PROHIBITED = ['aom', 'ben', 'arsenal']

// Files this guard does not read at all. Every entry is a hole in the gate, so
// the list is kept to exactly the files that still match — 25 entries were
// dropped on 2026-07-27 because the code under them had already been fixed and
// the exemption was covering nothing but future regressions. The success line
// below reports any entry that has gone dead, so the list can keep shrinking.
//
// Adding one back: put the file here WITH a comment saying why the literal is
// correct. "The build went red" is not a reason — an unexplained entry is how a
// real defect ends up permanently invisible.
const ALLOWLIST = new Set([
  'api/_lib/mailNoise.js',
  'api/dashboard/reset-agent.js',
  'api/dashboard/mission-folders.js',
  'api/dashboard/poke-agent.js',
  'api/dashboard/project-summary.js',
  'api/dashboard/voice-session.js',
  'api/dashboard/agent-customize.js',
  'api/dashboard/active-agents.js',
  // Intentional AOM operator boundary: this endpoint controls the single local
  // support watcher, not a tenant-selectable dashboard resource. The UI is
  // likewise gated to the AOM world and the endpoint still verifies AOM auth.
  'api/dashboard/support-autoreply.js',
  'api/dashboard/set-supabase-client-context.js',
  'api/dashboard/supabase-messages.js',
  'api/dashboard/supabase-status.js',
  'api/dashboard/v2-task-list.js',
  'api/relay-sms.js',
  'src/dashboard/components/cv3/session/StorageQuotaMeter.jsx',
  'src/dashboard/cv4/HomeView.jsx',
])

const tenantPattern = new RegExp(
  [
    String.raw`verifyTenant\(\s*['"](?:${PROHIBITED.join('|')})['"]`,
    String.raw`\b(?:client_id|world_id|tenant_id|client|world|tenant)\s*[:=]\s*['"](?:${PROHIBITED.join('|')})['"]`,
    String.raw`\b(?:client_id|world_id|tenant_id|client|world|tenant)=eq\.(?:${PROHIBITED.join('|')})\b`,
    String.raw`payload->>(?:client_id|world_id|tenant_id)=eq\.(?:${PROHIBITED.join('|')})\b`,
  ].join('|'),
  'i',
)

const uppercaseTenantConstantPattern = new RegExp(
  String.raw`\b[A-Z0-9_]*(?:CLIENT|TENANT|WORLD)[A-Z0-9_]*\s*=\s*['"](?:${PROHIBITED.join('|')})['"]`,
)

// Same defect, any casing (added r6, 2026-07-27 — for cause, not on spec).
// r5 shipped `export const DEFAULT_WORLD_STAMP = 'aom'` into write-message.js,
// the file whose entire job that round was to STOP treating 'aom' as a default
// world. The SHOUTY_CASE arm above caught it, which is the system working. But
// the identical constant written `const defaultWorld = 'aom'` walks straight
// through both patterns: the arm above requires all-caps, and the tenantPattern
// needs `world` to end on a word boundary immediately before the `=`, which
// `defaultWorld`/`worldStamp` never do. A guard that catches one spelling of a
// regression teaches the next author to change the spelling.
//
// Scoped to declarations (const/let/var) with a prohibited slug as the whole
// literal, so `const worlds = ['aom', ...]` and `const world = resolve()` stay
// clean. Measured before landing: zero new hits across all 779 scanned files,
// so this costs nothing today and only bites on the next rebirth.
const declaredTenantConstantPattern = new RegExp(
  String.raw`\b(?:const|let|var)\s+[A-Za-z0-9_$]*(?:CLIENT|TENANT|WORLD)[A-Za-z0-9_$]*\s*=\s*['"](?:${PROHIBITED.join('|')})['"]`,
  'i',
)

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full)
  }
  return files
}

// Strip comments line-by-line while preserving line numbers. Returns an array
// of scannable strings (empty string = nothing executable on that line).
// Handles: `//` line comments, `/* */` blocks spanning lines, `*` JSDoc
// continuations, and JSX `{/* */}`.
//
// WHY THIS EXISTS (2026-07-27). This guard scanned raw lines while its sibling
// check-no-hardcoded-identity.mjs stripped comments, so the two disagreed about
// whether a comment is code. The cost is not theoretical: the block comment in
// api/_lib/verifyTenant.js that DOCUMENTS this exact class of bug — "under
// verifyTenant('arsenal', req) they get callerWorld 'aom'" — failed the build,
// which is a guard punishing the write-up of the vulnerability it exists to
// prevent. A red-by-default gate is a gate everyone learns to skip, and the five
// real pre-existing violations underneath it survived that way.
//
// A comment cannot route a request, so it cannot be a hardcoded-tenant defect.
// Real violations are unaffected: executable code on the same line survives the
// strip (`const c = { client: 'aom' } // note` still fails), and `//` inside a
// URL is protected by the preceding `:`.
function stripComments(lines) {
  const out = []
  let inBlock = false
  for (const raw of lines) {
    let line = raw
    let scannable = ''
    while (line.length) {
      if (inBlock) {
        const end = line.indexOf('*/')
        if (end === -1) { line = ''; break }
        line = line.slice(end + 2)
        inBlock = false
        continue
      }
      const start = line.indexOf('/*')
      if (start === -1) { scannable += line; line = ''; break }
      scannable += line.slice(0, start)
      line = line.slice(start + 2)
      inBlock = true
    }
    const trimmed = scannable.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      scannable = ''
    } else {
      // Drop a trailing `//` line comment when it is not part of a URL.
      const idx = scannable.search(/(^|[^:'"\`])\/\//)
      if (idx !== -1) scannable = scannable.slice(0, scannable.indexOf('//', idx))
    }
    out.push(scannable)
  }
  return out
}

const hits = (rawLines) => {
  const found = []
  stripComments(rawLines).forEach((line, idx) => {
    if (!line.trim()) return
    if (
      tenantPattern.test(line) ||
      uppercaseTenantConstantPattern.test(line) ||
      declaredTenantConstantPattern.test(line)
    ) {
      // Report the RAW line: the stripped one is what matched, but the raw one
      // is what the engineer has to go find and fix.
      found.push(`${idx + 1}: ${rawLines[idx].trim()}`)
    }
  })
  return found
}

const failures = []
const seenAllowlisted = new Set()
const nowClean = []
let scanned = 0
for (const scanDir of SCAN_DIRS) {
  for (const file of walk(path.join(ROOT, scanDir))) {
    const rel = path.relative(ROOT, file)
    const rawLines = fs.readFileSync(file, 'utf8').split('\n')
    const found = hits(rawLines)
    if (ALLOWLIST.has(rel)) {
      seenAllowlisted.add(rel)
      // An allowlist entry that no longer matches anything is a blindfold nobody
      // needs. Reported, never fatal: the allowlist should shrink as files are
      // fixed, and it only shrinks if someone can see which lines are now dead.
      if (!found.length) nowClean.push(rel)
      continue
    }
    scanned++
    for (const f of found) failures.push(`${rel}:${f}`)
  }
}

if (failures.length) {
  console.error('Hardcoded tenant slug guard failed:')
  for (const line of failures) console.error(line)
  process.exit(1)
}

// Say what was actually looked at. A bare "ok" cannot be told apart from a guard
// that scanned nothing, and a guard nobody can audit is one nobody trusts.
const missingAllowlisted = [...ALLOWLIST].filter((rel) => !seenAllowlisted.has(rel))
console.log(
  `hardcoded tenant slug guard ok (${scanned} files scanned in ${SCAN_DIRS.join(', ')}, `
  + `${seenAllowlisted.size} allowlisted)`
)
if (nowClean.length) {
  console.log(`  allowlist entries no longer needed (${nowClean.length}): ${nowClean.join(', ')}`)
}
if (missingAllowlisted.length) {
  console.log(`  allowlist entries matching no file (${missingAllowlisted.length}): ${missingAllowlisted.join(', ')}`)
}
