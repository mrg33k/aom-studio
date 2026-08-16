import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * Temporal-dead-zone guard for CV6 hooks.
 *
 * A hook's dependency array is evaluated during render, in source order. So this throws
 * on every render:
 *
 *     useEffect(() => { ... shaped.data ... }, [shaped.data.recent, worldId])
 *     const shaped = useMemo(...)          // <- declared AFTER the hook that depends on it
 *
 * React never warns. The bundle minifies `shaped` to a single letter, so production shows
 * `ReferenceError: Cannot access 'g' before initialization`, CV6's error boundary catches
 * it, and the whole screen becomes "This screen hit a snag".
 *
 * This has shipped to production twice:
 *   2026-07-21  `missionLabelClean` used above its declaration in Home  (`'Lt'`)
 *   2026-08-15  `shaped` used in a dep array above its useMemo          (`'g'`)
 *
 * The first fix pinned that one variable pair, so the second one walked straight past it.
 * This test checks the whole class: every dependency array in the CV6 data hooks and
 * orchestrator, against every const/let declared in the same function.
 */

const FILES = [
  '../src/dashboard/cv6next/data/useHomeData.js',
  '../src/dashboard/cv6next/data/useRoomThread.js',
  '../src/dashboard/cv6next/CornerCV6.jsx',
]

const HOOK_WITH_DEPS = /\b(useEffect|useLayoutEffect|useMemo|useCallback)\s*\(/g

/** Split a file into top-level function bodies so we only compare within one scope. */
function functionSpans(src) {
  const spans = []
  const re = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm
  const starts = []
  let m
  while ((m = re.exec(src))) starts.push({ name: m[1], at: m.index })
  for (let i = 0; i < starts.length; i++) {
    spans.push({ name: starts[i].name, start: starts[i].at, end: i + 1 < starts.length ? starts[i + 1].at : src.length })
  }
  return spans
}

/** Find the matching ")" for the "(" that opens at `open`, respecting nesting and strings. */
function matchParen(src, open) {
  let depth = 0
  let quote = null
  for (let i = open; i < src.length; i++) {
    const c = src[i]
    const prev = src[i - 1]
    if (quote) { if (c === quote && prev !== '\\') quote = null; continue }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue }
    if (c === '(') depth++
    else if (c === ')') { depth--; if (depth === 0) return i }
  }
  return -1
}

/** The dependency array is the last top-level `[...]` inside the hook's argument list. */
function depArray(args) {
  const close = args.lastIndexOf(']')
  if (close === -1) return null
  let depth = 0
  for (let i = close; i >= 0; i--) {
    if (args[i] === ']') depth++
    else if (args[i] === '[') { depth--; if (depth === 0) return args.slice(i + 1, close) }
  }
  return null
}

function findTdzOffenders(src, name) {
    const spans = functionSpans(src)
    const offenders = []

    for (const span of spans) {
      const body = src.slice(span.start, span.end)

      // Bindings at the function's own body level (2-space indent in this codebase).
      // Deeper indentation means the binding lives inside a nested callback, where it
      // cannot be the thing a dependency array refers to.
      const decls = new Map()
      const declRe = /^ {2}(?:const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/gm
      let d
      while ((d = declRe.exec(body))) if (!decls.has(d[1])) decls.set(d[1], d.index)

      HOOK_WITH_DEPS.lastIndex = 0
      let h
      while ((h = HOOK_WITH_DEPS.exec(body))) {
        const openParen = h.index + h[0].length - 1
        const closeParen = matchParen(body, openParen)
        if (closeParen === -1) continue
        const deps = depArray(body.slice(openParen + 1, closeParen))
        if (!deps) continue

        // Root identifiers only. The lookbehind drops property names, so
        // `shaped.data.recent` yields `shaped` and never `data` or `recent`.
        const roots = new Set(
          (deps.match(/(?<![.\w$])[A-Za-z_$][A-Za-z0-9_$]*/g) || [])
            .filter((s) => !['true', 'false', 'null', 'undefined', 'typeof'].includes(s))
        )

        for (const root of roots) {
          const declAt = decls.get(root)
          if (declAt === undefined) continue          // a prop, import, or outer binding
          if (declAt > h.index) {
            const lineNo = body.slice(0, h.index).split('\n').length + src.slice(0, span.start).split('\n').length - 1
            offenders.push(
              `${name}:${lineNo} — ${span.name}() calls ${h[1]} depending on "${root}", ` +
              `but "${root}" is not declared until ${(body.slice(0, declAt).split('\n').length + src.slice(0, span.start).split('\n').length - 1)}. ` +
              `Move the declaration above the hook.`
            )
          }
        }
      }
    }

  return offenders
}

// The detector must prove itself on every run. A checker that has never failed is a
// signature, not a filter — which is exactly how the July fix let the August crash
// through. This sample is the real 2026-08-15 shape, reduced.
test('the detector actually catches a temporal dead zone', () => {
  const broken = [
    'export function useHome() {',
    '  const worldId = useTenant();',
    '  useEffect(() => {',
    '    if (!shaped.data.recent?.length) return;',
    '  }, [shaped.data.recent, worldId]);',
    '  const shaped = useMemo(() => shapeHome({ worldId }), [worldId]);',
    '  return shaped;',
    '}',
  ].join('\n')

  const found = findTdzOffenders(broken, 'sample.js')
  assert.equal(found.length, 1, `expected the sample TDZ to be caught, got: ${JSON.stringify(found)}`)
  assert.match(found[0], /"shaped"/, 'the offender should name the shadowed binding')
})

test('the detector does not flag a binding declared inside the callback body', () => {
  const fine = [
    'export function Home() {',
    '  const data = useData();',
    '  const resolve = useCallback((el) => {',
    '    const recent = (data.recent || []).find((x) => x.id === el.id);',
    '    return recent;',
    '  }, [data.recent]);',
    '  return resolve;',
    '}',
  ].join('\n')

  assert.deepEqual(findTdzOffenders(fine, 'sample.js'), [], 'a callback-local const is not a TDZ')
})

for (const rel of FILES) {
  const url = new URL(rel, import.meta.url)
  const src = readFileSync(url, 'utf8')
  const name = rel.split('/').pop()

  test(`${name}: no hook depends on a binding declared later in the same function`, () => {
    const offenders = findTdzOffenders(src, name)
    assert.deepEqual(offenders, [], `temporal dead zone: these throw on every render\n  ${offenders.join('\n  ')}`)
  })
}

test('useHomeData: shaped is memoized before the prefetch effect that depends on it', () => {
  const src = readFileSync(new URL('../src/dashboard/cv6next/data/useHomeData.js', import.meta.url), 'utf8')
  const hook = src.indexOf('export function useHome(')
  const shaped = src.indexOf('const shaped = useMemo(', hook)
  const prefetch = src.indexOf('prefetchedRef.current', hook)

  assert.notEqual(hook, -1, 'useHome not found')
  assert.notEqual(shaped, -1, 'shaped memo not found')
  assert.notEqual(prefetch, -1, 'prefetch effect not found')
  assert.ok(shaped < prefetch, 'const shaped must be declared before the prefetch effect reads it')
})
