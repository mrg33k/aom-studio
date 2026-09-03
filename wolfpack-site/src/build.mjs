import path from 'node:path'
import { createHash } from 'node:crypto'
import { cp, mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pages } from './data/pages.mjs'
import { asset, setAssetVersion } from './lib/html.mjs'
import { renderPage } from './templates/shell.mjs'

export { asset, escapeHtml } from './lib/html.mjs'

const site = {
  name: 'Wolfpack Companies',
  url: 'https://wolfpackcompanies.com/',
}

const sourceDir = fileURLToPath(new URL('.', import.meta.url))
const defaultOutDir = fileURLToPath(new URL('../dist', import.meta.url))

export function routeFile(outDir, slug) {
  return slug ? path.join(outDir, slug, 'index.html') : path.join(outDir, 'index.html')
}

function routeUrl(slug) {
  return `${site.url}${slug ? `${slug}/` : ''}`
}

function sitemap() {
  const urls = pages.map(page => `  <url><loc>${routeUrl(page.slug)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

async function copySharedAssets(outDir) {
  const assetDir = path.join(outDir, 'assets')
  await mkdir(assetDir, { recursive: true })
  await cp(path.join(sourceDir, 'styles', 'site.css'), path.join(assetDir, 'site.css'))
  await cp(path.join(sourceDir, 'browser', 'site.js'), path.join(assetDir, 'site.js'))
  await cp(path.join(sourceDir, 'assets'), assetDir, { recursive: true })
}

// Everything under /assets is served with a one-year immutable Cache-Control
// header, so every asset URL must change whenever its content does — not just
// site.css/site.js. Replacing an image under the same filename without this
// leaves returning visitors on the stale version indefinitely.
async function registerAssetVersions() {
  for (const [name, file] of [['site.css', ['styles', 'site.css']], ['site.js', ['browser', 'site.js']]]) {
    const content = await readFile(path.join(sourceDir, ...file))
    setAssetVersion(name, createHash('sha1').update(content).digest('hex').slice(0, 10))
  }
  const assetRoot = path.join(sourceDir, 'assets')
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else {
        const content = await readFile(full)
        setAssetVersion(path.relative(assetRoot, full), createHash('sha1').update(content).digest('hex').slice(0, 10))
      }
    }
  }
  await walk(assetRoot)
}

export async function buildSite({ outDir = defaultOutDir } = {}) {
  await rm(outDir, { recursive: true, force: true })
  await registerAssetVersions()
  const files = []

  for (const page of pages) {
    const file = routeFile(outDir, page.slug)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, renderPage(page, site), 'utf8')
    files.push(file)
  }

  await copySharedAssets(outDir)
  await writeFile(path.join(outDir, '404.html'), renderPage({
    title: 'Page not found',
    description: 'The page you requested could not be found.',
    slug: '',
  }, site), 'utf8')
  await writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}sitemap.xml\n`, 'utf8')
  await writeFile(path.join(outDir, 'sitemap.xml'), sitemap(), 'utf8')

  return files
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = await buildSite()
  console.log(`Built ${files.length} Wolfpack routes in ${defaultOutDir}`)
}
