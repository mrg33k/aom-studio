import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pages } from '../wolfpack-site/src/data/pages.mjs'
import { asset, buildSite, escapeHtml } from '../wolfpack-site/src/build.mjs'

const expectedSlugs = [
  '',
  'air-compressor',
  'apache-junction',
  'avondale',
  'backflow-testing',
  'chandler',
  'contact',
  'drain-cleaning',
  'emergency',
  'general-contractors',
  'gilbert',
  'glendale',
  'goodyear',
  'hydro-jetting',
  'leak-detection',
  'litchfield-park',
  'mesa',
  'paradise-valley',
  'peoria',
  'phoenix',
  'property-managers',
  'san-tan-valley',
  'scottsdale',
  'services',
  'surprise',
  'tempe',
  'water-heaters',
]

let builtDir
async function renderBuilt(slug) {
  if (!builtDir) {
    builtDir = await mkdtemp(path.join(tmpdir(), 'wolfpack-built-'))
    await buildSite({ outDir: builtDir })
  }
  const file = slug ? path.join(builtDir, slug, 'index.html') : path.join(builtDir, 'index.html')
  return readFile(file, 'utf8')
}

test('defines and emits all 27 Wolfpack routes', async () => {
  assert.equal(pages.length, 27)
  assert.equal(new Set(pages.map(page => page.slug)).size, 27)
  assert.deepEqual(pages.map(page => page.slug), expectedSlugs)
  assert.equal(pages.find(page => page.slug === '').kind, 'home')
  const outDir = await mkdtemp(path.join(tmpdir(), 'wolfpack-build-'))
  const files = await buildSite({ outDir })
  assert.equal(files.filter(file => file.endsWith('index.html')).length, 27)
  assert.deepEqual(files, expectedSlugs.map(slug => (
    slug ? path.join(outDir, slug, 'index.html') : path.join(outDir, 'index.html')
  )))
  const home = await readFile(path.join(outDir, 'index.html'), 'utf8')
  assert.match(home, /<html lang="en">/)
  assert.match(home, /https:\/\/wolfpackcompanies\.com\//)
})

test('emits shared assets and crawl-control files', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'wolfpack-build-'))
  await buildSite({ outDir })
  assert.match(await readFile(path.join(outDir, 'assets', 'site.css'), 'utf8'), /--ink: #0a0c10/)
  await readFile(path.join(outDir, 'assets', '.gitkeep'), 'utf8')
  assert.match(await readFile(path.join(outDir, '404.html'), 'utf8'), /Page not found/)
  assert.match(await readFile(path.join(outDir, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/wolfpackcompanies\.com\/sitemap\.xml/)
  assert.match(await readFile(path.join(outDir, 'sitemap.xml'), 'utf8'), /<loc>https:\/\/wolfpackcompanies\.com\/<\/loc>/)
})

test('browser baseline marks a loaded document as JavaScript-enabled', async () => {
  let dataAttribute = ''
  const script = await readFile(new URL('../wolfpack-site/src/browser/site.js', import.meta.url), 'utf8')
  new Function('document', script)({
    documentElement: { setAttribute: (name, value) => { dataAttribute = `${name}=${value}` } },
    addEventListener: () => {},
  })
  assert.equal(dataAttribute, 'data-js=true')
})

test('every page shares accessible launch chrome', async () => {
  const html = await renderBuilt('hydro-jetting')
  assert.match(html, /<header[^>]+data-site-header/)
  assert.match(html, /aria-controls="mobile-navigation"/)
  assert.match(html, /<dialog[^>]+id="lead-dialog"/)
  assert.match(html, /href="tel:6025505452"/)
  assert.match(html, /Service@wolfpackcompanies\.com/i)
  assert.match(html, /AZ ROC[^<]*326629/i)
})

test('escapes HTML and serves shared assets from the root', () => {
  assert.equal(escapeHtml('<Wolfpack & "Co">'), '&lt;Wolfpack &amp; &quot;Co&quot;&gt;')
  assert.equal(asset('site.css'), '/assets/site.css')
})

test('homepage carries the approved Evolution B v2 structure', async () => {
  const html = await renderBuilt('')
  for (const text of [
    'dominates clogs.',
    'Every line. One contractor.',
    'One invoice.',
    'Real jobs.',
    'Real results.',
    'How we get it done',
    'for every address',
    'Completed contracts',
    'Arizona licensed contractor',
    'The Ritz Carlton',
    'Edison Midtown',
    'What clients say',
  ]) {
    assert.ok(html.includes(text), text)
  }
  assert.match(html, /Before<\/span>[\s\S]+After<\/span>/)
  assert.match(html, /data-loader/)
  assert.match(html, /work\/01-hydro-jetting-v2-brand\.jpg/)
  assert.ok(!html.includes('page-placeholder'), 'homepage must not render the placeholder body')
})
