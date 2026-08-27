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

// --- Service family (kind 'service' + 'services') ----------------------------

const serviceFamilyTopics = {
  'hydro-jetting': 'Hydro jetting.',
  'drain-cleaning': 'Drain cleaning.',
  'air-compressor': 'Air compressor',
  'backflow-testing': 'Backflow testing.',
  'water-heaters': 'Water heaters',
  'leak-detection': 'leak detection.',
  emergency: '24/7 emergency.',
  services: 'Commercial plumbing',
}

test('each service-family route renders exactly one h1 naming its topic', async () => {
  for (const [slug, topic] of Object.entries(serviceFamilyTopics)) {
    const html = await renderBuilt(slug)
    const headings = html.match(/<h1[\s\S]*?<\/h1>/g) ?? []
    assert.equal(headings.length, 1, `${slug} must render exactly one h1`)
    assert.ok(headings[0].includes(topic), `${slug} h1 must contain "${topic}"`)
  }
})

test('hydro-jetting page carries its verbatim hero copy', async () => {
  const html = await renderBuilt('hydro-jetting')
  assert.ok(html.includes('High-pressure cleaning of commercial drain and sewer lines. Not a snake. Not a patch.'))
  for (const text of [
    'Service · the specialty',
    'You can see what',
    'we removed.',
    'Why hydrojetting is important.',
    'A cable punches a hole.',
    'Four steps. Documented.',
    'Free camera inspection',
    'with every jetting job.',
  ]) {
    assert.ok(html.includes(text), text)
  }
})

test('no service-family route falls back to the placeholder body', async () => {
  for (const slug of Object.keys(serviceFamilyTopics)) {
    const html = await renderBuilt(slug)
    assert.ok(!html.includes('page-placeholder'), `${slug} must not render the placeholder body`)
  }
})

test('every route title is unique across all pages', () => {
  const titles = pages.map(page => page.title)
  assert.equal(new Set(titles).size, titles.length)
})

test('service-family routes never reference the banned legacy AI images', async () => {
  const banned = ['work-', 'hero-jetting', 'jet-hero', 'fog-hero', 'pm-hero', 'pm-compliance']
  for (const slug of Object.keys(serviceFamilyTopics)) {
    const html = await renderBuilt(slug)
    const sources = html.match(/\/assets\/[^"']+\.(?:jpg|jpeg|png|webp)/g) ?? []
    for (const src of sources) {
      for (const fragment of banned) {
        assert.ok(!src.includes(fragment), `${slug} references banned image ${src}`)
      }
    }
  }
})

test('services overview links every service page plus property managers', async () => {
  const html = await renderBuilt('services')
  const cardSection = html.slice(html.indexOf('svc2-card-grid'))
  for (const href of [
    '/hydro-jetting/', '/drain-cleaning/', '/air-compressor/', '/backflow-testing/',
    '/water-heaters/', '/leak-detection/', '/emergency/', '/property-managers/',
  ]) {
    assert.ok(cardSection.includes(`href="${href}"`), `services grid must link ${href}`)
  }
})
