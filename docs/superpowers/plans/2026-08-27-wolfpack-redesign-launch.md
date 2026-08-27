# Wolfpack Redesign and Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, and launch the approved Wolfpack redesign across all 27 routes at `wolfpackcompanies.com` without losing the current site's images, leads, email service, or rollback path.

**Architecture:** Add an isolated vanilla Node static-site project at `wolfpack-site/`. A small build script renders shared ESM templates and page data into deployable HTML, CSS, JavaScript, sitemap, and robots files; a Vercel function delivers validated leads to both required inboxes. The existing `public/wolfpack-site/` tree stays untouched as rollback coverage, including Patrik's uncommitted homepage edits.

**Tech Stack:** Node.js ESM, semantic HTML, plain CSS and browser JavaScript, Node's built-in test runner, Playwright, Vercel Functions, Resend HTTP API, Vercel CLI, GoDaddy DNS.

**Spec:** `docs/superpowers/specs/2026-08-27-wolfpack-redesign-launch-design.md`

## Global Constraints

- Mission path is `wolfpack:homepage-redesign-launch`; update its `BUILD.md`, `CONTEXT.md`, and `last-conversation.md` at each significant transition.
- `Wolfpack Evolution B v2.dc.html` is the homepage visual source of truth; the supplied header, footer, services, hydro jetting, property manager, general contractor, and Scottsdale comps define the other page families.
- Preserve all 27 current routes and their page-specific search meaning.
- Preserve every current GoDaddy image before changing DNS.
- Send each accepted lead to `Service@wolfpackcompanies.com` and `hello@aom-inhouse.com`; show success only after the mail provider accepts the request.
- Keep `602-550-5452`, `Service@wolfpackcompanies.com`, and AZ ROC `326629` consistent site-wide.
- Support reduced motion, visible keyboard focus, semantic labels, 44-pixel interaction targets, and widths 320, 360, 390, 430, 768, 1024, 1280, and 1440 pixels.
- Do not modify `public/wolfpack-site/index.html`; it contains pre-existing uncommitted work.
- Deploy only a clean commit from `wolfpack-site/`; no unrelated shared-workspace changes may enter the release.
- Do not change GoDaddy DNS until Patrik explicitly approves the Vercel preview.
- Preserve MX, SPF, DKIM, DMARC, and all other email records during cutover.

---

### Task 1: Archive every image from the current GoDaddy site

**Files:**
- Create: `scripts/archive-wolfpack-current-site.mjs`
- Create: `tests/wolfpack-archive.test.mjs`
- Create: `wolfpack/missions/homepage-redesign-launch/research/godaddy-2026-08-27/manifest.json`
- Create: `wolfpack/missions/homepage-redesign-launch/research/godaddy-2026-08-27/images/*`
- Modify: `wolfpack/missions/homepage-redesign-launch/RESEARCH.md`
- Modify: `wolfpack/missions/homepage-redesign-launch/BUILD.md`

**Interfaces:**
- Consumes: public URL `https://wolfpackcompanies.com/`.
- Produces: `canonicalAssetKey(url: URL): string`, `widthOf(url: string): number`, `pickLargestVariant(urls: string[]): string`, `extensionFor(contentType: string, url: URL): string`, and a manifest shaped as `{ capturedAt, source, pageUrls, images: Array<{ file, sourceUrl, discoveredUrls, bytes, sha256, contentType }> }`.

- [ ] **Step 1: Write the failing archive-helper tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalAssetKey, pickLargestVariant, extensionFor } from '../scripts/archive-wolfpack-current-site.mjs'

test('groups GoDaddy width variants as one source asset', () => {
  const a = new URL('https://img1.wsimg.com/isteam/ip/id/photo.jpg/:/rs=w:450,m')
  const b = new URL('https://img1.wsimg.com/isteam/ip/id/photo.jpg/:/rs=w:1920,m')
  assert.equal(canonicalAssetKey(a), canonicalAssetKey(b))
})

test('keeps the largest GoDaddy variant', () => {
  const urls = ['https://img1.wsimg.com/x/:/rs=w:450,m', 'https://img1.wsimg.com/x/:/rs=w:1920,m']
  assert.match(pickLargestVariant(urls), /w:1920/)
})

test('uses response type when the CDN URL has no suffix', () => {
  assert.equal(extensionFor('image/webp', new URL('https://img1.wsimg.com/x')), '.webp')
})
```

- [ ] **Step 2: Run the helper tests and verify they fail**

Run: `node --test tests/wolfpack-archive.test.mjs`

Expected: FAIL because `scripts/archive-wolfpack-current-site.mjs` does not exist.

- [ ] **Step 3: Implement deterministic discovery and download**

```js
export function canonicalAssetKey(url) {
  return `${url.origin}${url.pathname.replace(/\/:\/.*$/, '')}`
}

export function widthOf(url) {
  const match = decodeURIComponent(url).match(/(?:w:|w=)(\d+)/)
  return match ? Number(match[1]) : 0
}

export function pickLargestVariant(urls) {
  return [...urls].sort((a, b) => widthOf(b) - widthOf(a))[0]
}

export function extensionFor(type, url) {
  const byType = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg' }
  return byType[type.split(';')[0]] || path.extname(url.pathname) || '.bin'
}
```

The executable path must use Playwright to load and slowly scroll every same-origin page discovered from navigation links, gather `img.src`, `img.currentSrc`, every `srcset` candidate, computed `background-image` URLs, and image response URLs from the performance log. Group GoDaddy responsive variants by `canonicalAssetKey`, fetch the largest variant, reject non-image responses, hash bytes with SHA-256, deduplicate matching hashes, and write the manifest only after every download settles.

- [ ] **Step 4: Run tests, then perform the real archive**

Run: `node --test tests/wolfpack-archive.test.mjs`

Expected: 3 tests PASS.

Run: `node scripts/archive-wolfpack-current-site.mjs --url https://wolfpackcompanies.com --out wolfpack/missions/homepage-redesign-launch/research/godaddy-2026-08-27`

Expected: exit 0, at least one page and one image in `manifest.json`, every listed file exists, every byte count is positive, and no manifest entry has a non-image MIME type.

- [ ] **Step 5: Verify archive integrity and size**

Run: `node -e "const m=require('./wolfpack/missions/homepage-redesign-launch/research/godaddy-2026-08-27/manifest.json');if(!m.images.length||m.images.some(x=>!x.sha256||x.bytes<1))process.exit(1);console.log({pages:m.pageUrls.length,images:m.images.length,bytes:m.images.reduce((n,x)=>n+x.bytes,0)})"`

Run: `find wolfpack/missions/homepage-redesign-launch/research/godaddy-2026-08-27/images -type f -size +90M -print`

Expected: integrity command exits 0; the large-file scan prints nothing.

- [ ] **Step 6: Record and commit the preservation round**

Update mission research with image count, byte total, source-page count, and archive path. Set R1 to shipped and R2 to in progress in `BUILD.md`.

```bash
git add scripts/archive-wolfpack-current-site.mjs tests/wolfpack-archive.test.mjs wolfpack/missions/homepage-redesign-launch
git commit -m "chore(wolfpack:homepage-redesign-launch): archive GoDaddy images"
```

---

### Task 2: Scaffold the isolated Wolfpack static-site project

**Files:**
- Create: `wolfpack-site/package.json`
- Create: `wolfpack-site/vercel.json`
- Create: `wolfpack-site/src/build.mjs`
- Create: `wolfpack-site/src/data/pages.mjs`
- Create: `wolfpack-site/src/lib/html.mjs`
- Create: `wolfpack-site/src/templates/shell.mjs`
- Create: `wolfpack-site/src/styles/site.css`
- Create: `wolfpack-site/src/browser/site.js`
- Create: `tests/wolfpack-build.test.mjs`

**Interfaces:**
- Consumes: `pages: PageDefinition[]` from `src/data/pages.mjs` and `renderPage(page, site): string` from template modules.
- Produces: `buildSite({ outDir: string }): Promise<string[]>`, `escapeHtml(value): string`, `asset(path): string`, and generated route files in `wolfpack-site/dist/`.

- [ ] **Step 1: Write the failing route/build contract**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pages } from '../wolfpack-site/src/data/pages.mjs'
import { buildSite } from '../wolfpack-site/src/build.mjs'

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
  const outDir = await mkdtemp(path.join(tmpdir(), 'wolfpack-build-'))
  const files = await buildSite({ outDir })
  assert.equal(files.filter(file => file.endsWith('index.html')).length, 27)
  const home = await readFile(path.join(outDir, 'index.html'), 'utf8')
  assert.match(home, /<html lang="en">/)
  assert.match(home, /https:\/\/wolfpackcompanies\.com\//)
})
```

- [ ] **Step 2: Run the build test and verify it fails**

Run: `node --test tests/wolfpack-build.test.mjs`

Expected: FAIL because the isolated project files do not exist.

- [ ] **Step 3: Define the project and page records**

`wolfpack-site/package.json`:

```json
{
  "name": "wolfpack-companies-site",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node src/build.mjs",
    "test": "node --test ../tests/wolfpack-archive.test.mjs ../tests/wolfpack-build.test.mjs ../tests/wolfpack-lead.test.mjs"
  }
}
```

`wolfpack-site/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "trailingSlash": true,
  "headers": [
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
  ]
}
```

Define the exact slugs: `''`, `air-compressor`, `apache-junction`, `avondale`, `backflow-testing`, `chandler`, `contact`, `drain-cleaning`, `emergency`, `general-contractors`, `gilbert`, `glendale`, `goodyear`, `hydro-jetting`, `leak-detection`, `litchfield-park`, `mesa`, `paradise-valley`, `peoria`, `phoenix`, `property-managers`, `san-tan-valley`, `scottsdale`, `services`, `surprise`, `tempe`, and `water-heaters`.

- [ ] **Step 4: Implement the renderer boundary**

```js
import path from 'node:path'
import { mkdir, rm, writeFile } from 'node:fs/promises'

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

export function routeFile(outDir, slug) {
  return slug ? path.join(outDir, slug, 'index.html') : path.join(outDir, 'index.html')
}

export async function buildSite({ outDir = new URL('../dist', import.meta.url).pathname } = {}) {
  await rm(outDir, { recursive: true, force: true })
  const files = []
  for (const page of pages) {
    const file = routeFile(outDir, page.slug)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, renderPage(page, site), 'utf8')
    files.push(file)
  }
  return files
}
```

The build must also copy `src/styles/site.css`, `src/browser/site.js`, and `src/assets/` into `dist/assets/`, and emit `404.html`, `robots.txt`, and `sitemap.xml`.

- [ ] **Step 5: Add the initial design tokens and browser baseline**

```css
:root {
  --ink: #0a0c10;
  --panel: #12151b;
  --paper: #f2f1ec;
  --muted: #aeb3bc;
  --blue: #489fd3;
  --blue-dark: #2f82b4;
  --rule: rgb(255 255 255 / 14%);
  --max: 1440px;
  --gutter: clamp(20px, 4vw, 48px);
}
* { box-sizing: border-box; }
html { color-scheme: dark; scroll-behavior: smooth; }
body { margin: 0; overflow-x: clip; background: var(--ink); color: var(--paper); font-family: Inter, system-ui, sans-serif; }
:focus-visible { outline: 3px solid var(--blue); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation: none !important; transition: none !important; } }
```

The browser baseline must add `data-js="true"`, make menus and dialogs usable without hiding page content when JavaScript fails, and never animate core text from `opacity: 0`.

- [ ] **Step 6: Run the test and production build**

Run: `node --test tests/wolfpack-build.test.mjs`

Expected: PASS.

Run: `npm --prefix wolfpack-site run build`

Expected: exit 0 with 27 `index.html` files plus shared assets, `sitemap.xml`, `robots.txt`, and `404.html`.

- [ ] **Step 7: Commit the isolated project boundary**

```bash
git add wolfpack-site tests/wolfpack-build.test.mjs
git commit -m "feat(wolfpack:homepage-redesign-launch): scaffold isolated site"
```

---

### Task 3: Build the shared header, footer, navigation, theme, and request dialog

**Files:**
- Modify: `wolfpack-site/src/templates/shell.mjs`
- Modify: `wolfpack-site/src/styles/site.css`
- Modify: `wolfpack-site/src/browser/site.js`
- Create: `wolfpack-site/src/assets/brand/*`
- Modify: `tests/wolfpack-build.test.mjs`

**Interfaces:**
- Consumes: `PageDefinition`, shared services and cities arrays.
- Produces: `renderHead(page): string`, `renderHeader(page): string`, `renderFooter(): string`, `renderLeadDialog(sourcePage): string`, and browser events `wolfpack:lead-open` / `wolfpack:lead-close`.

- [ ] **Step 1: Add failing shell assertions**

```js
test('every page shares accessible launch chrome', async () => {
  const html = await renderBuilt('hydro-jetting')
  assert.match(html, /<header[^>]+data-site-header/)
  assert.match(html, /aria-controls="mobile-navigation"/)
  assert.match(html, /<dialog[^>]+id="lead-dialog"/)
  assert.match(html, /href="tel:6025505452"/)
  assert.match(html, /Service@wolfpackcompanies\.com/i)
  assert.match(html, /AZ ROC[^<]*326629/i)
})
```

- [ ] **Step 2: Run the shell assertion and verify it fails**

Run: `node --test tests/wolfpack-build.test.mjs --test-name-pattern "accessible launch chrome"`

Expected: FAIL because the shared shell is incomplete.

- [ ] **Step 3: Port the approved shared shell once**

```js
export function renderHeader(page) {
  return `<header class="site-header" data-site-header>
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="header-main wrap">
      <a class="brand" href="/" aria-label="Wolfpack Companies home">${brandImages()}</a>
      <nav class="desktop-nav" aria-label="Primary">${primaryLinks(page)}</nav>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="mobile-navigation">Menu</button>
      <a class="header-call" href="tel:6025505452"><strong>602-550-5452</strong><span>24/7 emergency</span></a>
    </div>
    <nav id="mobile-navigation" class="mobile-nav" aria-label="Mobile" hidden>${mobileLinks(page)}</nav>
  </header>`
}
```

Use the supplied knockout logo on dark surfaces, keep services available in both desktop and mobile navigation, mark the active page with `aria-current="page"`, and make the emergency number visible without covering mobile content.

- [ ] **Step 4: Implement interaction and accessibility state**

```js
const menuButton = document.querySelector('.menu-button')
const mobileNav = document.querySelector('#mobile-navigation')
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true'
  menuButton.setAttribute('aria-expanded', String(open))
  mobileNav.hidden = !open
})

document.querySelectorAll('[data-lead-open]').forEach(button => button.addEventListener('click', event => {
  event.preventDefault()
  document.querySelector('#lead-dialog')?.showModal()
}))
```

Add Escape handling through native dialog behavior, focus return, scroll locking, click-outside close, and local persistence for the approved theme choice. Theme switching may change presentation only; all content stays readable in either mode.

- [ ] **Step 5: Run focused tests and inspect a local desktop/mobile shell**

Run: `node --test tests/wolfpack-build.test.mjs --test-name-pattern "accessible launch chrome"`

Expected: PASS.

Start in one terminal: `npm --prefix wolfpack-site run build && python3 -m http.server 4174 --directory wolfpack-site/dist`

Run in another terminal: `npx playwright screenshot --viewport-size=390,844 http://127.0.0.1:4174/hydro-jetting/ /tmp/wolfpack-shell-mobile.png`

Expected: no horizontal clipping; logo, menu, call action, footer, and request dialog remain reachable.

- [ ] **Step 6: Commit the shared shell**

```bash
git add wolfpack-site/src wolfpack-site/src/assets tests/wolfpack-build.test.mjs
git commit -m "feat(wolfpack:homepage-redesign-launch): add shared site shell"
```

---

### Task 4: Implement the approved homepage and production assets

**Files:**
- Create: `wolfpack-site/src/templates/home.mjs`
- Create: `wolfpack-site/src/assets/work/*`
- Modify: `wolfpack-site/src/data/pages.mjs`
- Modify: `wolfpack-site/src/templates/shell.mjs`
- Modify: `wolfpack-site/src/styles/site.css`
- Modify: `tests/wolfpack-build.test.mjs`

**Interfaces:**
- Consumes: home page data `{ stats, services, testimonials, work, steps, beforeAfter }` and asset URLs.
- Produces: `renderHome(page): string`, with section IDs `services`, `proof`, `work`, `process`, and `contact`.

- [ ] **Step 1: Add failing homepage-content assertions**

```js
test('homepage carries the approved Evolution B v2 proof structure', async () => {
  const html = await renderBuilt('')
  for (const text of ['Hydro jetting dominates clogs', 'Every line. One contractor. One invoice.', 'Real jobs. Real results.', 'How we get it done', 'One contact for every address you manage']) {
    assert.ok(html.includes(text), text)
  }
  assert.match(html, /Completed contracts/)
  assert.match(html, /Arizona licensed contractor/)
  assert.match(html, /Before[\s\S]+After/)
})
```

- [ ] **Step 2: Run the homepage test and verify it fails**

Run: `node --test tests/wolfpack-build.test.mjs --test-name-pattern "Evolution B v2"`

Expected: FAIL because the homepage template is not implemented.

- [ ] **Step 3: Import only assets required by approved comps**

Extract the feedback archive outside the repo, then copy the four brand files, loader pair, six before/after pipe files, the complete `assets/gc/` project set, and these supplied work images into `wolfpack-site/src/assets/`: `01-hydro-jetting-a.png`, `01-hydro-jetting-v2-brand.png`, `02-hydro-jetting-b.png`, `03-hydro-jetting-c.png`, `04-hydro-jetting-d.png`, `05-drain-camera-a.png`, `08-air-compressor-a.png`, `10-maintenance-a.png`, `12-backflow-a.png`, `14-water-heater-a.png`, `16-water-heater-b.png`, `17-leak-detection-a.png`, `19-emergency-a.png`, and `20-emergency-b.png`.

Use image metadata to reject the broken `13-backflow-a.png` reference and map that card to the supplied `13-backflow-b.png` file if the comp intends the second backflow image.

- [ ] **Step 4: Implement the homepage section contract**

```js
export function renderHome(page) {
  return [
    hero(page.hero),
    clientMarquee(page.clients),
    serviceExplorer(page.services),
    testimonialProof(page.testimonials),
    workGallery(page.work),
    beforeAfter(page.beforeAfter),
    processSteps(page.steps),
    contactBand(page.contact)
  ].join('\n')
}
```

Keep the headline as real selectable text, use factual project photography, attach every service row to its real route, stop the client marquee under reduced motion, and make testimonial controls real buttons with a visible count.

- [ ] **Step 5: Add the homepage responsive rules**

```css
.hero-title { font-family: Archivo, sans-serif; font-variation-settings: "wdth" 65, "wght" 900; font-size: clamp(3.1rem, 7vw, 6.25rem); line-height: .88; text-transform: uppercase; }
.home-services { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, .9fr); gap: clamp(32px, 5vw, 72px); }
@media (max-width: 767px) {
  .hero-title { font-size: clamp(2.75rem, 13.7vw, 4rem); overflow-wrap: anywhere; }
  .home-services { grid-template-columns: 1fr; }
  .work-grid, .before-after, .process-grid { display: grid; grid-template-columns: 1fr; }
}
```

- [ ] **Step 6: Run the test and visual comparison**

Run: `node --test tests/wolfpack-build.test.mjs --test-name-pattern "Evolution B v2"`

Expected: PASS.

Capture full-page screenshots at 390×844 and 1440×1000 and compare them with the already rendered `wolfpack-home-mobile.png` and `wolfpack-home-desktop.png`. Fix clipping, missing sections, wrong image choices, generic substitutions, and desktop-only spacing before committing.

- [ ] **Step 7: Commit the homepage**

```bash
git add wolfpack-site/src tests/wolfpack-build.test.mjs
git commit -m "feat(wolfpack:homepage-redesign-launch): build approved homepage"
```

---

### Task 5: Implement service, audience, city, and contact page families

**Files:**
- Create: `wolfpack-site/src/templates/service-index.mjs`
- Create: `wolfpack-site/src/templates/service-detail.mjs`
- Create: `wolfpack-site/src/templates/property-managers.mjs`
- Create: `wolfpack-site/src/templates/general-contractors.mjs`
- Create: `wolfpack-site/src/templates/city.mjs`
- Create: `wolfpack-site/src/templates/contact.mjs`
- Create: `wolfpack-site/src/check-links.mjs`
- Modify: `wolfpack-site/src/data/pages.mjs`
- Modify: `wolfpack-site/src/styles/site.css`
- Modify: `tests/wolfpack-build.test.mjs`

**Interfaces:**
- Consumes: discriminated page records with `kind: 'services' | 'service' | 'property-managers' | 'general-contractors' | 'city' | 'contact'`.
- Produces: one render function for each `kind`, unique metadata for every route, and a generated sitemap containing all 27 canonical URLs.

- [ ] **Step 1: Add failing family and uniqueness tests**

```js
test('all route families render unique search metadata and one h1', async () => {
  const seenTitles = new Set()
  for (const page of pages) {
    const html = await renderBuilt(page.slug)
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1]
    assert.ok(title && !seenTitles.has(title), page.slug)
    seenTitles.add(title)
    assert.equal((html.match(/<h1\b/g) || []).length, 1, page.slug)
    assert.match(html, new RegExp(`<link rel="canonical" href="https://wolfpackcompanies\\.com/${page.slug ? `${page.slug}/` : ''}">`))
  }
})

test('city pages keep their city in title, heading, and body', async () => {
  const html = await renderBuilt('scottsdale')
  assert.match(html, /<title>[^<]*Scottsdale/)
  assert.match(html, /<h1[^>]*>[^<]*Scottsdale/i)
  assert.ok((html.match(/Scottsdale/g) || []).length >= 3)
})
```

- [ ] **Step 2: Run the family tests and verify they fail**

Run: `node --test tests/wolfpack-build.test.mjs --test-name-pattern "route families|city pages"`

Expected: FAIL because inner templates and metadata are incomplete.

- [ ] **Step 3: Implement the service and audience dispatch**

```js
const renderers = {
  home: renderHome,
  services: renderServiceIndex,
  service: renderServiceDetail,
  'property-managers': renderPropertyManagers,
  'general-contractors': renderGeneralContractors,
  city: renderCity,
  contact: renderContact
}

export function renderPage(page, site) {
  const render = renderers[page.kind]
  if (!render) throw new TypeError(`Unknown page kind: ${page.kind}`)
  return renderShell({ page, site, body: render(page, site) })
}
```

Port the supplied content order exactly for services, hydro jetting, property managers, general contractors, and Scottsdale. Adapt the service-detail pattern to the seven remaining services using route-specific copy and images from the current static pages and approved archive; do not claim a project, certification, response time, or guarantee that is absent from the supplied source content.

- [ ] **Step 4: Populate unique city records**

Each city record must provide `name`, `slug`, `title`, `description`, `hero`, `serviceSentence`, and `nearbyCities`. Titles use `Commercial Plumbing in {City}, AZ | Wolfpack Companies`; descriptions name commercial plumbing, the city, Greater Phoenix, and the 24/7 call path without duplicating another city's full sentence.

```js
cityPage({
  name: 'Scottsdale',
  slug: 'scottsdale',
  hero: 'Commercial plumbing in Scottsdale.',
  serviceSentence: 'Phoenix-based crews serving Scottsdale properties with documented commercial plumbing work.',
  nearbyCities: ['phoenix', 'paradise-valley', 'tempe', 'mesa']
})
```

- [ ] **Step 5: Emit search and continuity files**

```js
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => `<url><loc>${canonical(page.slug)}</loc></url>`).join('')}</urlset>`
const robots = 'User-agent: *\nAllow: /\nSitemap: https://wolfpackcompanies.com/sitemap.xml\n'
```

Discover old GoDaddy path URLs during Task 1 and add only confirmed path redirects to `wolfpack-site/vercel.json`; never redirect email, DNS, or asset hosts.

- [ ] **Step 6: Run build, route, and broken-link checks**

Run: `node --test tests/wolfpack-build.test.mjs`

Expected: all build tests PASS.

Add `src/check-links.mjs`, and add `"check:links": "node src/check-links.mjs"` to `wolfpack-site/package.json`:

```js
const attributes = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(match => match[1])
for (const value of attributes) {
  if (/^(?:https?:|mailto:|tel:|#)/.test(value)) continue
  const pathname = value.split(/[?#]/)[0]
  const target = pathname.endsWith('/') ? path.join(outDir, pathname, 'index.html') : path.join(outDir, pathname)
  await access(target)
}
```

Run: `npm --prefix wolfpack-site run check:links`

Expected: exit 0 with all generated internal links and assets present.

- [ ] **Step 7: Commit all inner page families**

```bash
git add wolfpack-site tests/wolfpack-build.test.mjs wolfpack/missions/homepage-redesign-launch
git commit -m "feat(wolfpack:homepage-redesign-launch): build all page families"
```

---

### Task 6: Replace fake success with dual-inbox lead delivery

**Files:**
- Create: `wolfpack-site/api/lead.js`
- Modify: `wolfpack-site/src/templates/shell.mjs`
- Modify: `wolfpack-site/src/browser/site.js`
- Create: `tests/wolfpack-lead.test.mjs`
- Modify: `wolfpack/missions/homepage-redesign-launch/BUILD.md`

**Interfaces:**
- Consumes: JSON `{ name, company, phone, email, need, message, sourcePage, website, startedAt }`.
- Produces: `validateLead(input): { ok: true, lead } | { ok: false, errors }`, `buildLeadEmail(lead): { subject, html, text }`, and HTTP responses `{ ok: true }`, `{ ok: false, error: 'invalid' | 'rate-limited' | 'delivery-failed' }`.

- [ ] **Step 1: Write failing validation and delivery tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import handler, { validateLead, buildLeadEmail } from '../wolfpack-site/api/lead.js'

test('requires a name and one return channel', () => {
  assert.equal(validateLead({ name: 'Ross', phone: '602-550-5452', startedAt: Date.now() - 5000 }).ok, true)
  assert.equal(validateLead({ name: 'Ross', startedAt: Date.now() - 5000 }).ok, false)
})

test('honeypot submissions are rejected', () => {
  assert.equal(validateLead({ name: 'Bot', phone: '5555555555', website: 'spam', startedAt: Date.now() - 5000 }).ok, false)
})

test('email includes both operational context and visitor data', () => {
  const email = buildLeadEmail({ name: 'Ross', phone: '602-550-5452', need: 'Hydro jetting', sourcePage: '/hydro-jetting/' })
  assert.match(email.subject, /Hydro jetting/)
  assert.match(email.text, /602-550-5452/)
  assert.match(email.text, /\/hydro-jetting\//)
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `node --test tests/wolfpack-lead.test.mjs`

Expected: FAIL because `api/lead.js` does not exist.

- [ ] **Step 3: Implement bounded validation and mail payloads**

```js
const RECIPIENTS = ['Service@wolfpackcompanies.com', 'hello@aom-inhouse.com']
const clean = (value, max) => String(value || '').trim().slice(0, max)

export function validateLead(input = {}) {
  const lead = {
    name: clean(input.name, 100), company: clean(input.company, 120), phone: clean(input.phone, 40),
    email: clean(input.email, 160), need: clean(input.need, 120), message: clean(input.message, 2000),
    sourcePage: clean(input.sourcePage, 240), startedAt: Number(input.startedAt)
  }
  const bot = clean(input.website, 200) || !lead.startedAt || Date.now() - lead.startedAt < 1500
  const invalid = bot || !lead.name || (!lead.phone && !/^\S+@\S+\.\S+$/.test(lead.email))
  return invalid ? { ok: false, errors: ['invalid'] } : { ok: true, lead }
}
```

Use an in-memory IP window of five accepted attempts per ten minutes as best-effort serverless throttling. Send through `https://api.resend.com/emails` with `Authorization: Bearer ${process.env.RESEND_API_KEY}`, from `process.env.WOLFPACK_LEAD_FROM || 'Wolfpack Website <website@sourcing.directory>'`, `to: RECIPIENTS`, and `reply_to` when the visitor supplied an email. Return success only when Resend returns an accepted response.

```js
const attempts = new Map()
function rateLimited(ip, now = Date.now()) {
  const recent = (attempts.get(ip) || []).filter(time => now - time < 10 * 60_000)
  if (recent.length >= 5) return true
  attempts.set(ip, [...recent, now])
  return false
}
```

- [ ] **Step 4: Wire honest browser states**

```js
const response = await fetch('/api/lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), sourcePage: location.pathname, startedAt: Number(form.dataset.startedAt) })
})
if (!response.ok) throw new Error('delivery-failed')
form.replaceChildren(successPanel())
```

On failure, retain field values, announce the error through an `aria-live="polite"` region, and show clickable call and email fallbacks. Disable the button only during the request and restore it on failure.

- [ ] **Step 5: Run unit and local request tests**

Run: `node --test tests/wolfpack-lead.test.mjs`

Expected: PASS.

Run the handler locally with a stubbed `fetch` and assert the Resend payload has exactly the two approved recipients. Do not send a real client email during automated tests.

- [ ] **Step 6: Record the environment contract and commit**

Add `RESEND_API_KEY` and optional `WOLFPACK_LEAD_FROM` to the mission BUILD round. Do not add secret values to any file.

```bash
git add wolfpack-site tests/wolfpack-lead.test.mjs wolfpack/missions/homepage-redesign-launch
git commit -m "feat(wolfpack:homepage-redesign-launch): deliver website leads"
```

---

### Task 7: Complete mobile, accessibility, link, and performance QA

**Files:**
- Create: `tests/wolfpack-responsive.spec.mjs`
- Create: `wolfpack-site/playwright.config.mjs`
- Modify: `wolfpack-site/src/styles/site.css`
- Modify: `wolfpack-site/src/browser/site.js`
- Create: `wolfpack/missions/homepage-redesign-launch/research/qa-2026-08-27.md`
- Modify: `wolfpack/missions/homepage-redesign-launch/BUILD.md`

**Interfaces:**
- Consumes: the built `wolfpack-site/dist/` tree.
- Produces: responsive screenshots for each page family, a zero-overflow browser suite, keyboard/menu/dialog coverage, console-error coverage, and a written QA record.

- [ ] **Step 1: Configure the deterministic preview server**

```js
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '../tests',
  testMatch: 'wolfpack-responsive.spec.mjs',
  use: { baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && python3 -m http.server 4174 --directory dist',
    url: 'http://127.0.0.1:4174',
    cwd: new URL('.', import.meta.url).pathname,
    reuseExistingServer: false
  }
})
```

- [ ] **Step 2: Write the failing representative browser suite**

```js
import { test, expect } from '@playwright/test'

const routes = ['/', '/services/', '/hydro-jetting/', '/property-managers/', '/general-contractors/', '/scottsdale/', '/contact/']
const widths = [320, 360, 390, 430, 768, 1024, 1280, 1440]

for (const route of routes) for (const width of widths) {
  test(`${route} has no horizontal overflow at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 })
    const errors = []
    page.on('console', message => message.type() === 'error' && errors.push(message.text()))
    await page.goto(route)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
    expect(errors).toEqual([])
  })
}
```

- [ ] **Step 3: Run the browser suite and record initial failures**

Run: `npx playwright test tests/wolfpack-responsive.spec.mjs --config wolfpack-site/playwright.config.mjs`

Expected: at least one failure until all template families receive their final responsive pass.

- [ ] **Step 4: Add interaction and reduced-motion checks**

Test that the mobile menu opens, focus reaches each link, Escape closes it, the lead dialog traps and restores focus, all visible tap targets measure at least 44×44 pixels, reduced motion stops marquee/entry animation, every image has usable alt text or an empty alt when decorative, and every form field has a programmatic label.

```js
test('mobile navigation and request dialog are keyboard reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: /menu/i }).click()
  await expect(page.getByRole('navigation', { name: /mobile/i })).toBeVisible()
  await page.getByRole('link', { name: /request a walkthrough/i }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
```

- [ ] **Step 5: Fix every measured failure by family**

Keep mobile headline sizes inside the viewport, turn multi-column proof into ordered one-column sequences below 768 pixels, keep image focal points on workers and equipment, remove sticky behavior that exceeds the phone viewport, make before/after labels readable, and ensure the emergency call action does not cover footer or form controls.

```css
@media (max-width: 767px) {
  .desktop-nav, .service-strip { display: none; }
  .hero-title { max-width: 100%; font-size: clamp(2.75rem, 13.7vw, 4rem); overflow-wrap: anywhere; }
  .proof-grid, .work-grid, .before-after, .process-grid, .footer-grid { grid-template-columns: 1fr; }
  .sticky-preview { position: static; }
  .mobile-call { min-height: 44px; padding-bottom: max(12px, env(safe-area-inset-bottom)); }
  .site-footer { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
}
```

- [ ] **Step 6: Run all automated checks and production build**

Run: `node --test tests/wolfpack-archive.test.mjs tests/wolfpack-build.test.mjs tests/wolfpack-lead.test.mjs`

Run: `npx playwright test tests/wolfpack-responsive.spec.mjs --config wolfpack-site/playwright.config.mjs`

Run: `npm --prefix wolfpack-site run build`

Expected: all tests PASS and the build exits 0.

- [ ] **Step 7: Write visual QA evidence and commit**

The QA record must list tested routes and widths, screenshot paths, fixed findings, remaining non-blocking differences from the DreamCanvas comps, asset totals, link totals, and the exact test commands/results. Set R2 shipped and R3 shipped in BUILD only after all checks pass.

```bash
git add wolfpack-site tests/wolfpack-responsive.spec.mjs wolfpack/missions/homepage-redesign-launch
git commit -m "test(wolfpack:homepage-redesign-launch): finish launch QA"
```

---

### Task 8: Create the separate Vercel project and publish the approval preview

**Files:**
- Modify: `wolfpack/missions/homepage-redesign-launch/BUILD.md`
- Modify: `wolfpack/missions/homepage-redesign-launch/last-conversation.md`
- Create: `wolfpack/missions/homepage-redesign-launch/research/vercel-preview-2026-08-27.md`

**Interfaces:**
- Consumes: a clean commit containing `wolfpack-site/`, the existing Vercel team, and `RESEND_API_KEY` supplied without printing it.
- Produces: Vercel project `wolfpack-companies`, a Ready preview URL, a test lead accepted by both inboxes, and an explicit Patrik approval checkpoint.

- [ ] **Step 1: Verify release cleanliness and target scope**

Run: `git status --short -- wolfpack-site tests/wolfpack-* wolfpack/missions/homepage-redesign-launch`

Expected: no uncommitted files in the release paths.

Run: `npm --prefix wolfpack-site run build && node --test tests/wolfpack-build.test.mjs tests/wolfpack-lead.test.mjs`

Expected: PASS.

- [ ] **Step 2: Create and link the isolated project**

Run from `wolfpack-site/`: `vercel link --yes --project wolfpack-companies`

Then inspect `.vercel/project.json` and `vercel project inspect wolfpack-companies` to confirm the linked project is exactly `wolfpack-companies`, not `aom-studio` or `aom-studio-lab`.

- [ ] **Step 3: Add server-only environment values**

Add `RESEND_API_KEY` for Preview and Production without echoing it. Add `WOLFPACK_LEAD_FROM=Wolfpack Website <website@sourcing.directory>` for Preview and Production. Confirm names and target environments using `vercel env ls`; do not print or store the secret value.

- [ ] **Step 4: Publish and verify the preview**

Run from a clean `wolfpack-site/` directory: `vercel deploy`

Wait for Ready, then verify the returned HTTPS URL serves the Wolfpack homepage, all representative routes, CSS/JS/images, sitemap, robots, and `/api/lead`. Submit one clearly labeled test lead and confirm it arrives at both approved inboxes before removing or marking the test message.

- [ ] **Step 5: Record proof and stop for Patrik's approval**

Record the project ID, deployment ID, preview URL, source commit, routes checked, lead-delivery proof, and rollback source in the preview research file. Send Patrik the preview URL and stop; Task 9 is prohibited until he explicitly approves the preview for cutover.

- [ ] **Step 6: Commit preview documentation**

```bash
git add wolfpack/missions/homepage-redesign-launch
git commit -m "docs(wolfpack:homepage-redesign-launch): record preview proof"
```

---

### Task 9: Connect GoDaddy DNS and verify production

**Files:**
- Create: `wolfpack/missions/homepage-redesign-launch/research/dns-before-2026-08-27.txt`
- Create: `wolfpack/missions/homepage-redesign-launch/research/production-verification-2026-08-27.md`
- Modify: `wolfpack/missions/homepage-redesign-launch/BUILD.md`
- Modify: `wolfpack/missions/homepage-redesign-launch/CONTEXT.md`
- Modify: `wolfpack/missions/homepage-redesign-launch/last-conversation.md`

**Interfaces:**
- Consumes: Patrik's explicit preview approval, GoDaddy admin access, a Ready Wolfpack Vercel deployment, and Vercel's displayed domain-record instructions.
- Produces: verified canonical `https://wolfpackcompanies.com`, working `www` behavior, intact mail DNS, and documented rollback values.

- [ ] **Step 1: Snapshot all current DNS records before mutation**

Save the complete GoDaddy DNS record table and command-line snapshots for apex A/AAAA/CNAME, `www`, MX, TXT, CAA, SPF, DKIM selectors, and DMARC. The record must contain names, types, values, TTLs, and the capture time.

Run: `dig wolfpackcompanies.com A +noall +answer; dig wolfpackcompanies.com MX +noall +answer; dig wolfpackcompanies.com TXT +noall +answer; dig www.wolfpackcompanies.com CNAME +noall +answer; dig _dmarc.wolfpackcompanies.com TXT +noall +answer`

- [ ] **Step 2: Add both domains to the verified Wolfpack project**

Run from `wolfpack-site/`: `vercel domains add wolfpackcompanies.com wolfpack-companies` and `vercel domains add www.wolfpackcompanies.com wolfpack-companies`.

Inspect Vercel's domain instructions and resolve the exact required web records before editing GoDaddy. Do not guess Vercel IP values from memory.

- [ ] **Step 3: Change only the website records in GoDaddy**

Update the apex and `www` records exactly as Vercel requests. Leave MX, SPF, DKIM, DMARC, CAA unless Vercel explicitly requires a compatible CAA addition, and every unrelated service record unchanged. Record old and new values immediately.

- [ ] **Step 4: Wait for propagation and verify ownership/TLS**

Poll DNS with bounded checks and inspect Vercel domain status until both domains are Valid Configuration and HTTPS is active. Do not call the launch complete based on the deployment URL or a partially propagated resolver.

- [ ] **Step 5: Run canonical production acceptance**

Verify on `https://wolfpackcompanies.com` and `https://www.wolfpackcompanies.com`: canonical redirect choice, homepage, services, hydro jetting, property managers, general contractors, one city route, contact, sitemap, robots, all shared assets, call/email actions, theme/menu/dialog behavior, and one labeled live form request received by both inboxes. Run the seven representative routes at 390 and 1440 pixels against the real domain and confirm no console errors or horizontal overflow.

- [ ] **Step 6: Close the mission only after production proof**

Write deployment ID, source commit, final DNS records, preserved mail-record hashes, route results, form proof, screenshots, and rollback steps in the production verification file. Mark R4 shipped, set CONTEXT status to DONE, and append the final result to `last-conversation.md`.

```bash
git add wolfpack/missions/homepage-redesign-launch
git commit -m "docs(wolfpack:homepage-redesign-launch): verify production launch"
```
