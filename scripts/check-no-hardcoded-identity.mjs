#!/usr/bin/env node
// scripts/check-no-hardcoded-identity.mjs
//
// Regression guard for the identity-attribution defect class found on
// 2026-07-27 (audit: corner/missions/chat/missions/full-chat/missions/
// voice-chat/research/2026-07-27-identity-attribution-audit.md).
//
// WHY THIS EXISTS
// Corner was built single-player. The AOM world holds THREE humans (Patrik,
// Ash, Courtney); Ben and Karen have their own worlds; projects and missions
// can be shared across worlds. The database already models all of that
// (messages.user_id / user_name / world_id / sender_role). But most write
// paths and every model prompt hardcoded "Patrik" as the human on the other
// end, so a teammate's voice call was recorded and narrated as the founder's.
//
// The dangerous part: "Patrik said X" acts as an AUTHORIZATION TOKEN. Agents
// take actions for that phrase they would take for nobody else. A hardcoded
// person name in an identity slot is therefore a security defect, not a
// cosmetic one.
//
// The rule this enforces:
//   Identity is derived SERVER-SIDE from the JWT (api/_lib/verifyTenant.js),
//   never from a literal and never from a default. An unattributed message
//   must read as UNATTRIBUTED — never as Patrik.
//
// WHAT FAILS THE CHECK (executable code only)
//   identity-default   `... || 'Patrik'`, `... ?? "Courtney"`, and the same
//                      shape on any identity field defaulting to a
//                      person-shaped literal (so a NEW name is caught too).
//   prompt-identity    a model prompt asserting who the human is:
//                      "You talk to Patrik", "The visitor is Patrik",
//                      "Patrik just ended a voice call", "Act on anything
//                      Patrik said", "messages with Patrik",
//                      "  -> Patrik: ${answer}".
//   hardcoded-author   an author/speaker field set to a literal person,
//                      including `turn.role === 'user' ? 'Patrik'`.
//
// WHAT IT DELIBERATELY DOES **NOT** FAIL ON (a guard that cries wolf gets
// disabled within a week, which is worse than no guard at all)
//   - Comments (line, block, JSDoc, JSX), docs, markdown.
//   - FACTS about the company. "AOM is Patrik's company", "Patrik is the
//     founder", "you draft replies for Patrik" (api/support/suggest.js writes
//     outbound email in the owner's voice — correct and intended). A fact
//     about the owner is fine; a claim about who is SPEAKING is not.
//   - Authorization config: SUPER_ADMIN_USER_ID (api/_lib/verifyTenant.js) is
//     a UUID env constant, and the email allowlists in
//     api/ai-hours/admin-auth.js are auth config. Neither is an identity
//     assumption, and neither matches any rule below.
//   - Honest generic fallbacks: 'You', 'User', 'Someone', 'Agent', 'Room',
//     'Unknown', 'there', ... Those are the CORRECT answer when identity is
//     unknown, so they are explicitly allowed (see GENERIC_FALLBACKS).
//   - Tests, fixtures, mocks, design-kit demo data, node_modules, dist.
//
// ESCAPE HATCH for a reviewed exception (mirrors the ALLOW_ANTHROPIC_COMMENT
// convention in scripts/check-no-anthropic-api.cjs): put the token
//
//     ALLOW_HARDCODED_IDENTITY
//
// on the offending line, or on the line directly above it, with a one-line
// reason. Example:
//
//     // ALLOW_HARDCODED_IDENTITY: outbound email is written in the owner's voice
//
// Use it for statements of fact about the workspace owner. Never use it to
// assert who is on the other end of a conversation — resolve that per call.
//
// MAINTENANCE: when a new human joins a world, add their display name to
// KNOWN_PEOPLE. The identity-default rule also catches unknown names via the
// generic identity-field rule, so a missing entry degrades coverage, it does
// not silently pass everything.
//
// Run: npm run test:identity  (also runs inside npm run test:tenant-context)
//
// WORKING DIRECTORY: irrelevant, on purpose. ROOT is resolved from THIS FILE's
// location, never from process.cwd(). The first version used cwd, so running it
// the documented way from the repo root scanned a same-named `src` directory
// OUTSIDE this package, found one file, and printed "clean (1 files)" while
// nine real violations sat in aom-studio/src. A guard that reports success when
// it scanned the wrong tree is worse than no guard: it converts an unreviewed
// tree into a green tick. Do not reintroduce cwd, and do not add a way to aim
// this at an arbitrary directory — the whole point is that it always scans the
// same files.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// scripts/ -> package root (aom-studio/). Same files scanned from anywhere.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCAN_DIRS = ['api', 'src']
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'])
const OPT_OUT = 'ALLOW_HARDCODED_IDENTITY'

// Real humans with accounts in this system. Display names as they appear in
// code, longest first so the alternation prefers the full name.
const KNOWN_PEOPLE = ['Patrik Matheson', 'Patrik', 'Courtney', 'Karen', 'Ash', 'Ben']
const NAME = `(?:${KNOWN_PEOPLE.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`

// Fields that carry WHO somebody is. A person-shaped literal defaulted into
// one of these is the defect, whatever the name.
const IDENTITY_KEYS =
  '(?:user_name|userName|full_name|fullName|display_name|displayName|author|author_name|authorName|' +
  'speaker|sender_name|senderName|from_name|fromName|owner|assignee|requested_by|requestedBy|' +
  'answered_by|answeredBy|reviewer|caller|actor)'

// Honest answers when identity is unknown. These are what the fix is SUPPOSED
// to look like, so they must never trip the guard.
const GENERIC_FALLBACKS = new Set(
  [
    'you', 'user', 'users', 'someone', 'somebody', 'unknown', 'unattributed', 'anonymous', 'anon',
    'agent', 'assistant', 'bot', 'teammate', 'a teammate', 'member', 'guest', 'visitor', 'client',
    'customer', 'owner', 'team', 'everyone', 'system', 'support', 'room', 'review', 'reviewer',
    'dashboard', 'admin', 'staff', 'human', 'person', 'none', 'null', 'undefined', 'untitled',
    'unnamed', 'no name', 'there', 'me', 'corner', 'aom', 'voice', 'model',
  ].map((s) => s.toLowerCase()),
)

// A literal that looks like a person's name: Capitalized, 3+ letters,
// optionally "First Last". Excludes 'P', 'U', 'there', emails, slugs.
const PERSON_SHAPED = /^[A-Z][a-z]{2,}(?:[ -][A-Z][a-z]+)*$/

// A prompt that NEGATES the identity assumption is the fix, not the bug.
// "Never assume the visitor is Patrik", "Do NOT assume this was Patrik",
// "never report a call as a call with Patrik unless the name above IS Patrik"
// must all pass, or the guard punishes the correct code and gets deleted.
const NEGATION = /\b(?:never|not|n't|nobody|no one|avoid|unless|instead of|rather than|no longer|unverified|unattributed|cannot|regardless)\b/i

// Design-kit / demo payloads (SAMPLE_SCRIBE, MOCK_USER, DEMO_ROOMS...). Named
// as sample data, rendered as sample data — not an identity claim about a
// live human. Everything from the declaration to its closing brace is skipped.
const SAMPLE_BLOCK_START =
  /^\s*(?:export\s+)?(?:const|let|var)\s+(?:SAMPLE|MOCK|DEMO|FIXTURE|FIXTURES|PLACEHOLDER|EXAMPLE|SEED|DUMMY|STUB)[A-Z0-9_]*\s*=/

// Per-file, per-rule reviewed exceptions. Scoped to ONE rule on purpose — a
// blanket file allowlist would blind the guard to the other two shapes.
// Prefer the inline OPT_OUT token; this map is for files a lane does not own.
const REVIEWED_EXCEPTIONS = {
  // AOM's own voice: this prompt drafts outbound email FOR the workspace
  // owner. "You draft replies for Patrik at AOM" is a fact about the SENDER,
  // not a claim about who is on the other end of the conversation.
  'api/support/suggest.js': ['prompt-identity'],
}

// Tests / fixtures / mocks / design-kit demo data / archived code.
const SKIP_PATH_PATTERNS = [
  /(^|\/)(__tests__|__mocks__|tests?|fixtures?|mocks?|stories|archive|accept)\//i,
  /\.(test|spec|stories)\.[cm]?[jt]sx?$/i,
  /(^|\/)(fixture|mock|demo|sample|seed)[A-Za-z]*\.[cm]?[jt]sx?$/i,
  /(Test|Tests|Fixture|Fixtures|Mock|Mocks|Gallery|Demo|Playground|Sandbox)\.[cm]?[jt]sx?$/,
]

// ---------------------------------------------------------------------------
// Rules. Each entry: { id, why, patterns[], check?, reject? }
// `check`  gets the RegExp match; return true to confirm the hit (used where
//          the shape alone is not enough — generic identity-field defaults).
// `reject` gets the whole code line; return true to drop the hit (used to let
//          negated prompt statements through).
// ---------------------------------------------------------------------------
const RULES = [
  {
    id: 'identity-default',
    why: "an unattributed message must read as unattributed, never as a person — drop the `|| 'Name'` default",
    patterns: [
      // `... || 'Patrik'` / `... ?? "Courtney"` — a known human as a fallback.
      new RegExp(String.raw`(?:\|\||\?\?)\s*['"\`]${NAME}\b`, 'i'),
    ],
  },
  {
    id: 'identity-default',
    why: "an identity field is defaulting to a person-shaped literal — use 'Someone' / omit the name, or resolve identity from the JWT",
    // Group 1 = the fallback literal, so `check` can judge it.
    patterns: [
      new RegExp(
        String.raw`\b${IDENTITY_KEYS}\b[^=;\n]{0,80}?(?:\|\||\?\?)\s*['"\`]([^'"\`]{1,40})['"\`]`,
      ),
    ],
    check: (m) => {
      const literal = (m[1] || '').trim()
      if (!literal) return false
      if (GENERIC_FALLBACKS.has(literal.toLowerCase())) return false
      return PERSON_SHAPED.test(literal)
    },
  },
  {
    id: 'prompt-identity',
    why: 'a model prompt is asserting who the human is — resolve the speaker per call (callerIdentity from the JWT) and name the actual person',
    // A sentence that tells the model NOT to assume is the fix. Let it pass.
    reject: (line) => NEGATION.test(line),
    patterns: [
      // "You talk to Patrik directly" / "you are working with Ash"
      new RegExp(
        String.raw`\byou(?:'re|\s+are|\s+r)?\s+(?:talk(?:ing)?|speak(?:ing)?|chat(?:ting)?|work(?:ing)?|deal(?:ing)?)\s+(?:to|with)\s+${NAME}\b`,
        'i',
      ),
      // "The visitor is Patrik (or someone he sent)"
      new RegExp(
        String.raw`\b(?:the\s+)?(?:visitor|user|caller|human|person|speaker|sender|guest|client)\b[^.'"\n]{0,40}?\bis\s+${NAME}\b`,
        'i',
      ),
      // "Patrik just ended a voice call" / "Act on anything Patrik said"
      new RegExp(
        String.raw`\b${NAME}\s+(?:just\s+|has\s+|had\s+|recently\s+)?(?:said|says|asked|ended|reviewed|requested|approved|typed|answered|replied|wrote|told)\b`,
        'i',
      ),
      // "RECENT CONVERSATION (most recent messages with Patrik)" — mislabels
      // shared room history as one person's private thread.
      new RegExp(
        String.raw`\b(?:messages?|conversation|chat|history|thread)\s+with\s+${NAME}\b`,
        'i',
      ),
    ],
  },
  {
    id: 'hardcoded-author',
    why: 'a message/author field is being written with a literal person — persist the JWT-derived user_id/user_name instead',
    patterns: [
      // `user_name: 'Patrik'`, `author = "Ash"`. Message-row author columns
      // only — `speaker`/`owner` are UI labels and live in the other rules.
      new RegExp(
        String.raw`\b(?:user_name|userName|user_id|userId|author|author_name|authorName|sender_name|senderName|from_name|fromName)\s*[:=]\s*['"\`]${NAME}\b`,
      ),
    ],
  },
  {
    id: 'hardcoded-author',
    why: 'a speaker label is a hardcoded person — label the resolved speaker, and say "Someone" when identity is unknown',
    patterns: [
      // `turn.role === 'user' ? 'Patrik'`, `isVoiceUser ? 'Patrik (voice)'`
      new RegExp(
        String.raw`\b(?:role|sender_role|senderRole|speaker|author|sender|\w*[Uu]ser\w*)\b[^?\n]{0,80}\?\s*['"\`]${NAME}\b`,
      ),
      // "  -> Patrik: ${answer}" — attributing composed text to a literal person
      new RegExp(String.raw`${NAME}\s*:\s*\$\{`, 'i'),
    ],
  },
]

// ---------------------------------------------------------------------------

function shouldSkipPath(rel) {
  return SKIP_PATH_PATTERNS.some((re) => re.test(rel))
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === 'build' ||
      entry.name === 'coverage' ||
      entry.name === '.git' ||
      entry.name === '.next' ||
      entry.name === '.vercel'
    ) {
      continue
    }
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

// Mask out SAMPLE_/MOCK_/DEMO_ declarations (kit demo payloads) by blanking
// every line from the declaration to the line where its brackets close.
// SAMPLE_BLOCK_MAX_LINES is a safety stop: a bracket inside a string literal
// can leave the depth counter unbalanced, and an unbalanced counter would
// blind the guard for the rest of the file. Bounded blindness only.
const SAMPLE_BLOCK_MAX_LINES = 200
function maskSampleBlocks(code) {
  let depth = 0
  let span = 0
  let inBlock = false
  for (let i = 0; i < code.length; i++) {
    const line = code[i]
    if (!inBlock && SAMPLE_BLOCK_START.test(line)) {
      inBlock = true
      depth = 0
      span = 0
    }
    if (!inBlock) continue
    for (const ch of line) {
      if (ch === '{' || ch === '[' || ch === '(') depth++
      else if (ch === '}' || ch === ']' || ch === ')') depth--
    }
    code[i] = ''
    if (depth <= 0 || ++span >= SAMPLE_BLOCK_MAX_LINES) inBlock = false
  }
  return code
}

const failures = []
let scanned = 0

// Belt to the ROOT braces: if a scan directory is missing, the guard has been
// pointed at the wrong tree and CANNOT know whether the code is clean. Say so
// and fail. Silence here is what produced "clean (1 files)" on a tree with
// nine violations.
const missingDirs = SCAN_DIRS.filter((d) => !fs.existsSync(path.join(ROOT, d)))
if (missingDirs.length) {
  console.error('[no-hardcoded-identity] FAILED — nothing to scan.')
  console.error(`  root:    ${ROOT}`)
  console.error(`  missing: ${missingDirs.join(', ')}`)
  console.error('  This guard resolves its root from its own file location, so a missing')
  console.error('  directory means the package layout moved — not that the tree is clean.')
  process.exit(1)
}

for (const scanDir of SCAN_DIRS) {
  for (const file of walk(path.join(ROOT, scanDir))) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    if (shouldSkipPath(rel)) continue
    scanned++
    const exempt = REVIEWED_EXCEPTIONS[rel] || []
    const rawLines = fs.readFileSync(file, 'utf8').split('\n')
    const code = maskSampleBlocks(stripComments(rawLines))

    code.forEach((line, idx) => {
      if (!line.trim()) return
      if (rawLines[idx].includes(OPT_OUT)) return
      if (idx > 0 && rawLines[idx - 1].includes(OPT_OUT)) return

      for (const rule of RULES) {
        if (exempt.includes(rule.id)) continue
        if (rule.reject && rule.reject(line)) continue
        for (const re of rule.patterns) {
          const m = line.match(re)
          if (!m) continue
          if (rule.check && !rule.check(m)) continue
          failures.push({
            rel,
            line: idx + 1,
            id: rule.id,
            why: rule.why,
            text: rawLines[idx].trim().slice(0, 160),
          })
          return // one finding per line is enough
        }
      }
    })
  }
}

if (!scanned) {
  console.error('[no-hardcoded-identity] FAILED — 0 files scanned.')
  console.error(`  root: ${ROOT} (dirs: ${SCAN_DIRS.join(', ')})`)
  console.error('  A scan of nothing is not a pass.')
  process.exit(1)
}

if (failures.length) {
  console.error('[no-hardcoded-identity] FAILED — a person is hardcoded where identity must be resolved:')
  console.error('')
  for (const f of failures) {
    console.error(`  ${f.rel}:${f.line}  [${f.id}]`)
    console.error(`    ${f.text}`)
    console.error(`    -> ${f.why}`)
  }
  console.error('')
  console.error(`[no-hardcoded-identity] ${failures.length} violation(s) in ${scanned} files.`)
  console.error("Identity comes from the JWT (api/_lib/verifyTenant.js), never from a literal or a default.")
  console.error(`Reviewed exception? Put ${OPT_OUT} on the line (or the line above) with a reason.`)
  process.exit(1)
}

// Print the root, not just the count: an operator reading a green line must be
// able to see WHAT was scanned without trusting the number alone.
console.log(`[no-hardcoded-identity] clean (${scanned} files in ${SCAN_DIRS.join(', ')} under ${ROOT})`)
