#!/usr/bin/env node
// Prebuild + pre-commit guard. Fails the build if anything in api/
// re-introduces a direct Anthropic API call. Rule:
// feedback_no_anthropic_api_anywhere.md — all LLM synthesis goes
// through tmux Claude Code workers via the supabase-listener path.
//
// Allowed reference forms (comments / docs): the strings can appear in
// commented-out historical context. The check below skips any line
// whose first non-whitespace chars are `//` or `*` or `#`. It also
// skips lines containing the literal token `ALLOW_ANTHROPIC_COMMENT`
// which can be used to mark intentional doctrine references.
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', 'api')
const FORBIDDEN = [
  /api\.anthropic\.com/,
  /@anthropic-ai\/sdk/,
  /new\s+Anthropic\s*\(/,
]

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(js|ts|mjs|cjs)$/.test(e.name)) out.push(p)
  }
  return out
}

let hits = 0
for (const file of walk(ROOT)) {
  const txt = fs.readFileSync(file, 'utf8')
  const lines = txt.split('\n')
  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) return
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) return
    if (line.includes('ALLOW_ANTHROPIC_COMMENT')) return
    for (const re of FORBIDDEN) {
      if (re.test(line)) {
        console.error(`[no-anthropic-api] ${file}:${idx + 1}  ${line.trim()}`)
        hits++
      }
    }
  })
}

if (hits > 0) {
  console.error('')
  console.error(`[no-anthropic-api] FAILED: ${hits} forbidden Anthropic API reference(s) in api/.`)
  console.error('Rule: feedback_no_anthropic_api_anywhere.md — use tmux Claude Code workers, not api.anthropic.com.')
  process.exit(1)
}
console.log(`[no-anthropic-api] clean (${ROOT})`)
