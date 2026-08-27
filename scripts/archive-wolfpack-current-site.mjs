import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

export function canonicalAssetKey(url) {
  return `${url.origin}${url.pathname.replace(/\/:\/.*$/, '')}`
}

export function assetGroupKey(url) {
  return url.hostname.endsWith('.wsimg.com') ? canonicalAssetKey(url) : url.href
}

export function widthOf(url) {
  const match = decodeURIComponent(url).match(/(?:w:|w=)(\d+)/)
  return match ? Number(match[1]) : 0
}

export function pickLargestVariant(urls) {
  return [...urls].sort((a, b) => widthOf(b) - widthOf(a))[0]
}

export function extensionFor(type, url) {
  const byType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  }
  return byType[type.split(';')[0]] || path.extname(url.pathname) || '.bin'
}

function httpUrl(value, base) {
  try {
    const url = new URL(value, base)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function pageKey(url) {
  url.hash = ''
  return url.href
}

export function srcsetUrls(srcset) {
  return srcset
    .split(/,(?=\s*(?:https?:)?\/\/)/)
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean)
}

export function srcsetAttributeUrls({ srcset = '', dataSrcsetlazy = '' }) {
  return [...new Set([...srcsetUrls(srcset), ...srcsetUrls(dataSrcsetlazy)])]
}

async function scrollPage(page) {
  let previousHeight = 0
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(350)
    const nextHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    if (nextHeight === height && height === previousHeight) break
    previousHeight = nextHeight
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const urls = new Set()
    const links = new Set()
    const add = (value) => {
      if (!value) return
      try {
        const url = new URL(value, location.href)
        if (url.protocol === 'http:' || url.protocol === 'https:') urls.add(url.href)
      } catch {}
    }
    const addSrcset = (srcset) => {
      for (const candidate of srcset.split(/,(?=\s*(?:https?:)?\/\/)/)) add(candidate.trim().split(/\s+/)[0])
    }

    for (const image of document.images) {
      add(image.src)
      add(image.currentSrc)
      addSrcset(image.srcset || '')
    }
    for (const element of document.querySelectorAll('[srcset], [data-srcsetlazy]')) {
      addSrcset(element.getAttribute('srcset') || '')
      addSrcset(element.getAttribute('data-srcsetlazy') || '')
    }
    for (const element of document.querySelectorAll('*')) {
      for (const match of getComputedStyle(element).backgroundImage.matchAll(/url\((['"]?)(.*?)\1\)/g)) add(match[2])
    }
    for (const entry of performance.getEntriesByType('resource')) {
      if (entry.initiatorType === 'img') add(entry.name)
    }
    for (const anchor of document.querySelectorAll('a[href]')) {
      try {
        const url = new URL(anchor.href, location.href)
        if (url.origin === location.origin && (url.protocol === 'http:' || url.protocol === 'https:')) {
          url.hash = ''
          links.add(url.href)
        }
      } catch {}
    }
    return { imageUrls: [...urls], links: [...links] }
  })
}

export async function loadPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(1_000)
}

async function discover(url) {
  const root = new URL(url)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  const queued = [pageKey(root)]
  const seen = new Set()
  const imageUrls = new Set()

  try {
    while (queued.length) {
      const current = queued.shift()
      if (seen.has(current)) continue
      seen.add(current)
      await loadPage(page, current)
      await scrollPage(page)
      const found = await inspectPage(page)
      for (const imageUrl of found.imageUrls) imageUrls.add(imageUrl)
      for (const link of found.links) {
        const candidate = httpUrl(link)
        if (candidate?.origin === root.origin) {
          const key = pageKey(candidate)
          if (!seen.has(key)) queued.push(key)
        }
      }
    }
  } finally {
    await browser.close()
  }

  return { pageUrls: [...seen].sort(), imageUrls: [...imageUrls].sort() }
}

function groupVariants(urls) {
  const groups = new Map()
  for (const value of urls) {
    const url = httpUrl(value)
    if (!url) continue
    const key = assetGroupKey(url)
    const variants = groups.get(key) || new Set()
    variants.add(url.href)
    groups.set(key, variants)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, variants]) => ({ key, urls: [...variants].sort() }))
}

async function fetchImage(group) {
  const sourceUrl = pickLargestVariant(group.urls)
  const response = await fetch(sourceUrl, { headers: { 'user-agent': 'Mozilla/5.0 (archive; Wolfpack preservation)' } })
  if (!response.ok) throw new Error(`${response.status} while downloading ${sourceUrl}`)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`non-image response (${contentType || 'missing content type'}) from ${sourceUrl}`)
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  if (!bytes.length) throw new Error(`empty image response from ${sourceUrl}`)
  return { sourceUrl, discoveredUrls: group.urls, bytes, contentType }
}

async function writeArchive({ url, out }) {
  const { pageUrls, imageUrls } = await discover(url)
  const settled = await Promise.allSettled(groupVariants(imageUrls).map(fetchImage))
  const failures = settled.filter((result) => result.status === 'rejected')
  if (failures.length) throw new AggregateError(failures.map((result) => result.reason), 'Some image downloads failed')

  const imagesDir = path.join(out, 'images')
  await mkdir(imagesDir, { recursive: true })
  const byHash = new Map()
  for (const result of settled) {
    const image = result.value
    const sha256 = createHash('sha256').update(image.bytes).digest('hex')
    const existing = byHash.get(sha256)
    if (existing) {
      existing.discoveredUrls = [...new Set([...existing.discoveredUrls, ...image.discoveredUrls])].sort()
      continue
    }
    const file = path.join('images', `${String(byHash.size + 1).padStart(3, '0')}${extensionFor(image.contentType, new URL(image.sourceUrl))}`)
    await writeFile(path.join(out, file), image.bytes)
    byHash.set(sha256, {
      file,
      sourceUrl: image.sourceUrl,
      discoveredUrls: image.discoveredUrls,
      bytes: image.bytes.length,
      sha256,
      contentType: image.contentType,
    })
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    source: new URL(url).href,
    pageUrls,
    images: [...byHash.values()],
  }
  await writeFile(path.join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

function parseArguments(argv) {
  const args = new Map()
  for (let index = 0; index < argv.length; index += 2) args.set(argv[index], argv[index + 1])
  return { url: args.get('--url'), out: args.get('--out') }
}

async function main() {
  const { url, out } = parseArguments(process.argv.slice(2))
  if (!url || !out) throw new Error('Usage: node scripts/archive-wolfpack-current-site.mjs --url <url> --out <directory>')
  const manifest = await writeArchive({ url, out })
  console.log(JSON.stringify({ pages: manifest.pageUrls.length, images: manifest.images.length, bytes: manifest.images.reduce((total, image) => total + image.bytes, 0) }))
}

if (process.argv[1]?.endsWith('/scripts/archive-wolfpack-current-site.mjs')) {
  try {
    await main()
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}
