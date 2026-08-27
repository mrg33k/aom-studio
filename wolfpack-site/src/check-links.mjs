// Internal link checker: walks every built HTML file in dist, extracts every
// href/src, skips external/mailto/tel/fragment/data URLs, and asserts that
// every internal target exists in dist. Run with `npm run check:links` after
// `npm run build`. Exits 1 and lists every broken reference on failure.
import path from 'node:path'
import { readdir, readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const distDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : fileURLToPath(new URL('../dist', import.meta.url))

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await htmlFiles(full))
    else if (entry.name.endsWith('.html')) files.push(full)
  }
  return files
}

function extractTargets(html) {
  return [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(match => match[1])
}

function isExternal(url) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url) || url.startsWith('#')
}

async function exists(file) {
  try {
    return (await stat(file)).isFile()
  } catch {
    return false
  }
}

async function resolveTarget(url, fromFile) {
  const clean = url.split('#')[0].split('?')[0]
  if (!clean) return true
  const base = clean.startsWith('/')
    ? path.join(distDir, clean)
    : path.resolve(path.dirname(fromFile), clean)
  if (clean.endsWith('/')) return exists(path.join(base, 'index.html'))
  if (await exists(base)) return true
  return exists(path.join(base, 'index.html'))
}

const files = await htmlFiles(distDir)
if (!files.length) {
  console.error(`check-links: no HTML files found in ${distDir} — run the build first`)
  process.exit(1)
}

let checked = 0
const broken = []
for (const file of files) {
  const html = await readFile(file, 'utf8')
  for (const url of extractTargets(html)) {
    if (isExternal(url)) continue
    checked += 1
    if (!await resolveTarget(url, file)) {
      broken.push(`${path.relative(distDir, file)} -> ${url}`)
    }
  }
}

if (broken.length) {
  console.error(`check-links: ${broken.length} broken internal reference(s):`)
  for (const line of broken) console.error(`  ${line}`)
  process.exit(1)
}

console.log(`check-links: ${checked} internal references across ${files.length} HTML files all resolve in ${path.basename(distDir)}/`)
