// /api/prospect-scan — the fast path. A company name and a website in, findings
// on the surfaces a buyer can see out, in under ten seconds, while the operator
// is still on the page.
//
//   POST /api/prospect-scan  { company, website, city? }  ->  { surfaces[], findings[], ... }
//
// ── WHY THIS IS NOT THE NIGHTLY CHECK ──────────────────────────────────────
// scripts/client-engine-check.py is a DISPATCHED BACKGROUND TASK: a row goes
// into `tasks`, task-runner claims it, the repo lock serialises it, and the
// board finds out later. That is right for a client we already have — it runs
// at 04:30 and nobody is watching. It cannot serve this. Patrik's use is
// "run it cold right before a phone call and send the page ahead of dialling",
// and a queued task behind a repo lock is a thirty-second spinner in the one
// moment of the funnel that has to feel like the agency already knows.
//
// So: same standards, same SSRF line (`_lib/publicFetch.js` is that file's
// guard, ported), different execution model — synchronous, parallel, and on a
// hard clock. What it does NOT share is Python's validate-then-fetch order; see
// the header of publicFetch.js for why the check moved to connect time.
//
// ── THE CLOCK ──────────────────────────────────────────────────────────────
// One deadline for the whole request (default 9s, under the ten). Every fetch
// gets min(its own ceiling, whatever is left). Work goes in two waves because
// the second wave's addresses are DISCOVERED IN the first — you cannot open a
// company's Google listing until their homepage has told you where it is:
//
//   wave 1  the homepage, and the plain-http probe, in parallel
//   wave 2  every profile the homepage links to, in parallel, capped at five
//
// A surface we ran out of time for says exactly that and carries no finding.
// Partial results with an honest "we could not reach this" beat a spinner, and
// they beat a guess by more.
//
// ── WHAT IT IS ALLOWED TO SAY ──────────────────────────────────────────────
// This page is a first impression on somebody who has never met us. One wrong
// claim destroys the call it was meant to open. So every finding is a LITERAL
// FACT ABOUT A DOCUMENT WE FETCHED — this string is present, this tag is
// absent, this address answered 404 — never an inference, never a "likely",
// never a score. Three rules hold it there:
//
//   1. A finding that JUDGES (good or weak) must carry a receipt: the URL we
//      actually opened. `finding()` throws otherwise. That is the same line the
//      database draws with `verified_needs_a_receipt`, drawn again here because
//      this route writes no row and so the constraint cannot reach it.
//   2. NOT FINDING SOMETHING IS NOT FINDING ITS ABSENCE. "We found no link to a
//      Google listing on your homepage" is a fact about the homepage. "You have
//      no Google listing" is a claim about the world that we did not check, and
//      a Google SEARCH url is not a listing — the board already carries one
//      Disputed claim from exactly that mistake. Anything in that class is
//      standing 'unknown' and says what it would take to check it.
//   3. NO NUMBER APPEARS THAT WE DID NOT MEASURE. Milliseconds, byte counts and
//      the count of our own findings are measured. There are no percentages,
//      no benchmarks and no "most buyers" anywhere in the copy below.
//
// And no gamification, no score out of ten, no encouragement. The `costs`
// sentence on a weak finding is what it costs them, in their words, and it is
// hand-written per finding — a template repeats, and a repeating sentence is
// how a reader learns to skip the field.
//
// ── GATED, AND WHY ─────────────────────────────────────────────────────────
// POST is behind the same session gate as the rest of the tool: an
// authenticated member of the AOM world. It is NOT public. Three reasons, in
// the order they matter:
//
//   1. It is an outbound HTTP client that takes its target from the caller.
//      Even with the private-address guard, an anonymous caller can aim AOM's
//      egress IP and AOM's named user-agent at any domain on the internet, as
//      many times as they like. The guard stops it reaching an internal
//      service; nothing stops it being AOM's name in a stranger's access log.
//   2. Unbounded work per anonymous request. Nine outbound fetches and up to
//      ~2MB read per call, loopable from a shell. Auth is the only rate limit
//      that survives contact with someone who wants to abuse it — there are
//      four operators, not four thousand.
//   3. The funnel does not need it public. The PROSPECT never runs a scan; the
//      prospect reads a report that was already run. So the expensive,
//      abusable, outbound-fetching half stays operator-only, and the cheap,
//      static, already-produced half — the report page (work queue item 14) —
//      is what gets shared, by unguessable link. Gating the scan costs the
//      product nothing and removes the whole abuse surface.
//
// The blast radius of one authorised call is bounded too, and deliberately:
// MAX_FETCHES requests, and a read ceiling per response (see HOMEPAGE_BYTES for
// why the homepage's is the size it is).
//
// This route stores nothing. No table, no row, no migration — the scan is
// returned and forgotten. Persistence belongs to the report page that has to
// render a scan somebody already ran, and inventing its schema from here would
// be guessing at it.

import { TenantAuthError, verifyTenant } from './_lib/verifyTenant.js'
import { assertPublicUrl, BlockedTarget, fetchOnce, fetchPublic, urlProblem }
  from './_lib/publicFetch.js'

export const config = { maxDuration: 15 }

// The operators. Not a per-client gate: a prospect is by definition not a
// client and has no project row to check against.
const TENANT = process.env.CLIENT_ENGINE_TENANT || 'aom'

const TOTAL_BUDGET_MS = 9000     // under the ten, with room for the response
const HOMEPAGE_MS = 5000
const SECONDARY_MS = 3000
// A page on the prospect's OWN site, opened in wave 2. Same ceiling as a
// profile because it is one hop and we already know the host answers.
const INTERNAL_MS = 3000
// WHY THIS WENT FROM 9 TO 12. Measured scans finish in 0.2–1.9s against a nine
// second budget, and six of seven surfaces were coming back "not checked here"
// — not because they are unreachable, but because nothing ever went and looked.
// Wave 1 now costs three (homepage, plain-http probe, robots.txt), wave 2 up to
// two pages on their own site, wave 3 up to five profiles. Twelve is that worst
// case plus the http fallback. The wall clock, not this number, is what keeps
// the scan under ten seconds; this is the memory and politeness ceiling.
const MAX_FETCHES = 12
const MAX_PROFILE_FETCHES = 5
const MAX_INTERNAL_FETCHES = 2
// WHY THIS NUMBER IS SO MUCH BIGGER THAN A HOMEPAGE.
//
// It started at 400KB, which is a generous homepage. The first real contractor
// this was pointed at — Midstate Mechanical, a Phoenix commercial HVAC firm and
// exactly the buyer AOM sells to — returns 830KB, of which a single inlined
// <style> block is 702KB and <body> does not begin until byte 733,937. Every
// cap under three quarters of a megabyte reads nothing but their stylesheet,
// and the scan then reports "no phone number on the homepage" about a page with
// eight tel: links in it. That is the exact failure this whole product exists
// to prevent, produced by our own read limit.
//
// So the cap is now sized to protect MEMORY, which is the thing a cap is
// actually for. Time is already bounded, and bounded better, by the wall clock
// — a page too big to read inside the budget times out and says so. Worst case
// per authorised call is one homepage plus five profiles: ~1.9MB.
//
// The truncation handling in websiteFindings stays either way. A cap that is
// rarely hit is still hit, and a cut read must never pretend to be a whole one.
const HOMEPAGE_BYTES = 1500000
// THE SAME NUMBER AS THE HOMEPAGE, AND MEASURED BEFORE IT WAS CHOSEN. An inside
// page on the same theme carries the same inlined stylesheet: Wilson Electric's
// /markets/ is 1,198,863 bytes and <body> does not begin until byte 1,147,905.
// Every cap under that reads the stylesheet and nothing else, and the scan then
// reports "we opened it and it links to no projects" about a page listing
// thirteen of them. That is the exact failure this round exists to remove, and
// halving the cap to save memory would have reintroduced it one page deeper.
// Worst case per authorised call is now ~4.6MB: one homepage, two inside pages,
// five profiles.
const INTERNAL_BYTES = 1500000
const SECONDARY_BYTES = 80000
const ROBOTS_BYTES = 60000

const MAX_COMPANY = 120
const MAX_CITY = 80

// The board's own "Found by buyers" group, exactly. These seven are what a
// stranger's public surfaces map onto, so a scan can become a client's board
// without a translation layer. Everything else on the board — the job
// management system, insurance and licensing, follow-up speed — sits behind
// access we do not have from outside, and is not in this file at all. Not as a
// grey row, not as an estimate. It is not scannable, so it is not scanned.
const SURFACES = [
  ['website', 'Website'],
  ['google-business-profile', 'Google Business Profile'],
  ['online-reviews', 'Online reviews'],
  ['company-linkedin', 'Company LinkedIn'],
  ['owners-linkedin', "Owner's LinkedIn"],
  ['yelp', 'Yelp'],
  ['ai-answers', 'AI answers'],
]
const SURFACE_NAME = Object.fromEntries(SURFACES)

// ── READING A PAGE ─────────────────────────────────────────────────────────
// Regex, not a parser, on purpose: one dependency-free pass over at most 400KB,
// inside a budget measured in milliseconds. Everything it returns is a literal
// — a tag that is present, an href that is there — because everything it
// returns ends up quoted on a page a stranger reads.

// A page we quote back to a stranger has to read like the page, not like a view
// source. Named entities that actually turn up in trade copy, plus the numeric
// forms, because "Midstate Mechanical &#8211; Commercial HVAC" on a report we
// sent ahead of a phone call is the whole product's credibility in one string.
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–',
  mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  hellip: '…', middot: '·', bull: '•', reg: '®', copy: '©', trade: '™', deg: '°',
}
export function decodeEntities(s) {
  return String(s == null ? '' : s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const n = parseInt(h, 16)
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : _
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const n = parseInt(d, 10)
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : _
    })
    .replace(/&([a-z]+);/gi, (m, name) => {
      const hit = ENTITIES[name.toLowerCase()]
      return hit === undefined ? m : hit
    })
}

// THE SAFETY NET UNDER THE COMPRESSION FIX.
//
// publicFetch now asks for gzip and undoes it, which is the cause fixed. This
// is the CLASS fixed: before a single finding is written, the thing we fetched
// has to actually be a readable web page. An unknown encoding, a PDF served at
// the root, a body of replacement characters — every one of those reads to a
// regex as "no title, no phone number, no images", and a scan that reports the
// absence of things it could not have seen is worse than no scan.
//
// Returns a plain sentence for the report, or null when the body is fine.
export function unreadableBody(res) {
  if (res.undecodable) {
    return `It answered in an encoding we could not undo (${res.contentEncoding}), so we ` +
      'did not read it. Nothing here is a finding about your website.'
  }
  const type = String(res.contentType || '').toLowerCase().split(';')[0].trim()
  if (type && !/^(text\/|application\/(xhtml|xml|json))/.test(type)) {
    return `The address answered with ${type} rather than a web page, so there was ` +
      'nothing to read.'
  }
  const head = String(res.body || '').slice(0, 4000)
  if (!head.trim()) return 'It answered, but sent no page with the answer.'
  if (!head.includes('<')) {
    return 'It answered with something that has no markup in it at all, so we did ' +
      'not treat it as a web page.'
  }
  let unreadable = 0
  for (let i = 0; i < head.length; i++) {
    const c = head.charCodeAt(i)
    // U+FFFD is what undecoded binary turns into, and it is the tell.
    if (c === 0xfffd || c === 0 || (c > 13 && c < 32) || (c > 0 && c < 9)) unreadable += 1
  }
  if (unreadable / head.length > 0.02) {
    return 'It answered with bytes that are not readable text, so we did not read ' +
      'them. Nothing here is a finding about your website.'
  }
  return null
}

export function readHtml(html) {
  const src = String(html || '')
  const stripped = src
    // Paired first. Then the UNPAIRED tail: when a 400KB read cuts a page in the
    // middle of a <style> block, the paired rule matches nothing and the whole
    // stylesheet lands in the "page text" — which is how a report ends up
    // quoting "Compiled CSS - Do not edit" back at a prospect as their own copy.
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, ' ')
    .replace(/<(script|style|svg|noscript|template)\b[^>]*>[\s\S]*$/i, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  const text = decodeEntities(stripped.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

  const titleM = src.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleM
    ? decodeEntities(titleM[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
    : ''

  const viewportM = src.match(/<meta[^>]+name\s*=\s*["']?viewport["']?[^>]*>/i)

  // EVERY ANCHOR, NOT EVERY WELL-FORMED ANCHOR. The paired pass is what gives a
  // link its LABEL, and a label is what most of this file reads. But a page
  // whose markup never closes an <a> — a slider layer, a card wrapper, a theme
  // that emits `<a ...>` around a block and closes it three divs later — drops
  // out of a paired match entirely. A finding that then says "we read every link
  // on your homepage" would be false, so the unpaired pass sweeps up the rest
  // with an empty label rather than leaving them unseen.
  const links = []
  const seenPair = new Set()
  const seenHref = new Set()
  const HREF_IN = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
  const push = (href, label) => {
    const h = String(href || '').trim()
    if (!h) return
    const key = `${h} :: ${label}`
    if (seenPair.has(key)) return
    seenPair.add(key)
    seenHref.add(h)
    links.push({ href: h, label })
  }
  const LINK_CEILING = 1500
  let m
  const pairRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  while ((m = pairRe.exec(src)) !== null) {
    const hrefM = m[1].match(HREF_IN)
    if (!hrefM) continue
    const label = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    push(hrefM[1] || hrefM[2] || hrefM[3], label)
    if (links.length >= LINK_CEILING) break
  }
  const anyRe = /<a\b([^>]*)>/gi
  while (links.length < LINK_CEILING && (m = anyRe.exec(src)) !== null) {
    const hrefM = m[1].match(HREF_IN)
    if (!hrefM) continue
    const href = (hrefM[1] || hrefM[2] || hrefM[3] || '').trim()
    if (!href) continue
    // Already carried by the paired pass, with its label. Do not duplicate it
    // as a labelless twin.
    if (seenHref.has(href)) continue
    push(href, '')
  }
  const linksTruncated = links.length >= LINK_CEILING

  // An embedded Google map is an address the site publishes for itself, exactly
  // like a link to it, and it lives in a src rather than an href. A site with a
  // map embedded in its footer and no Maps link in its nav was reading, until
  // now, as a site with no listing anywhere.
  const frames = []
  const frameRe = /<iframe\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
  while ((m = frameRe.exec(src)) !== null) {
    const s = (m[1] || m[2] || m[3] || '').trim()
    if (s) frames.push(s)
    if (frames.length >= 40) break
  }

  const jsonld = []
  const ldRe = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  while ((m = ldRe.exec(src)) !== null) {
    try { jsonld.push(JSON.parse(m[1].trim())) } catch { /* malformed, ignore */ }
  }

  // TEXT A READER SEES THAT IS NOT IN THE TEXT NODES. "Commercial Electrical
  // Contractor in Phoenix" is the alt on Wilson Electric's hero image; a search
  // that only reads text nodes and then reports the word "does not appear
  // anywhere in the homepage" is claiming more than it looked at. This is the
  // rest of what a person actually reads: image captions, button labels, the
  // description a search engine shows.
  const captions = []
  const attrRe = /\b(alt|title|aria-label|placeholder)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
  while ((m = attrRe.exec(src)) !== null) {
    const v = decodeEntities(m[2] != null ? m[2] : m[3]).replace(/\s+/g, ' ').trim()
    if (v) captions.push(v)
    if (captions.length >= 400) break
  }
  const metaRe = /<meta\b[^>]*>/gi
  const metas = []
  while ((m = metaRe.exec(src)) !== null) {
    const tag = m[0]
    const which = tag.match(/\b(?:name|property)\s*=\s*["']?([a-z0-9:_-]+)/i)
    if (!which) continue
    if (!/^(description|og:description|og:title|og:site_name|twitter:description|twitter:title)$/i
      .test(which[1])) continue
    const c = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
    if (!c) continue
    const v = decodeEntities(c[1] != null ? c[1] : c[2]).replace(/\s+/g, ' ').trim()
    if (v) metas.push(v)
  }

  return {
    title,
    viewport: viewportM ? viewportM[0].replace(/\s+/g, ' ').trim() : null,
    links,
    linksTruncated,
    frames,
    text,
    captions,
    metas,
    jsonld,
    images: (src.match(/<img\b/gi) || []).length,
    forms: (src.match(/<form\b/gi) || []).length,
    inputs: (src.match(/<input\b|<textarea\b/gi) || []).length,
  }
}

// Everything on the page a person reads, in one string: the text nodes, the
// title, the image captions and button labels, and the description a search
// engine is handed. Named separately from `page.text` because a finding that
// searches this has to SAY it searched this.
export function readableSurface(page) {
  return [page.title, page.text, ...(page.captions || []), ...(page.metas || [])]
    .filter(Boolean).join(' · ')
}

// The first aggregateRating anywhere in the page's own structured data.
export function findAggregateRating(nodes) {
  const seen = new Set()
  const walk = (node) => {
    if (!node || typeof node !== 'object') return null
    if (seen.has(node)) return null
    seen.add(node)
    if (Array.isArray(node)) {
      for (const child of node) { const hit = walk(child); if (hit) return hit }
      return null
    }
    const rating = node.aggregateRating
    if (rating && typeof rating === 'object' && !Array.isArray(rating)) {
      const value = rating.ratingValue
      const count = rating.reviewCount != null ? rating.reviewCount : rating.ratingCount
      if (value != null || count != null) return { value, count }
    }
    for (const k of Object.keys(node)) { const hit = walk(node[k]); if (hit) return hit }
    return null
  }
  return walk(nodes)
}

// Where a homepage sends a buyer next. Matching is on the HOST, not on the
// whole string, so a blog post that mentions linkedin.com in a paragraph is not
// mistaken for the company's page.
const PROFILE_PATTERNS = [
  ['google-business-profile', (u) =>
    (/(^|\.)google\.[a-z.]+$/i.test(u.hostname) && /^\/maps\b/i.test(u.pathname)) ||
    /(^|\.)g\.page$/i.test(u.hostname) ||
    // g.co/kgs/… is the share link Google itself hands out for a listing.
    (/(^|\.)g\.co$/i.test(u.hostname) && /^\/kgs\//i.test(u.pathname)) ||
    // maps.app.goo.gl/<id> — the CURRENT Google share link, which carries no
    // /maps path at all. Wilson Electric publishes one of these and the old
    // host-plus-path rule walked straight past it.
    /(^|\.)maps\.app\.goo\.gl$/i.test(u.hostname) ||
    (/(^|\.)goo\.gl$/i.test(u.hostname) && /^\/maps\b/i.test(u.pathname))],
  ['yelp', (u) => /(^|\.)yelp\.[a-z.]+$/i.test(u.hostname) && /^\/biz\//i.test(u.pathname)],
  ['company-linkedin', (u) =>
    /(^|\.)linkedin\.com$/i.test(u.hostname) && /^\/(company|school|showcase)\//i.test(u.pathname)],
  ['owners-linkedin', (u) =>
    /(^|\.)linkedin\.com$/i.test(u.hostname) && /^\/(in|pub)\//i.test(u.pathname)],
]

// A Google map embedded in the page. Not an anchor, so it never reached the old
// matcher, and it is the address the site publishes for its own listing.
function embeddedMap(u) {
  return /(^|\.)google\.[a-z.]+$/i.test(u.hostname) &&
    /^\/maps\/embed/i.test(u.pathname)
}

// schema.org sameAs is the business telling a machine, in its own markup, where
// its profiles are. Reading it is not inference — it is reading what they
// published — and it is the difference between "we found no LinkedIn link" and
// finding the one that only ever appears in their structured data.
export function sameAsUrls(nodes) {
  const out = []
  const seen = new Set()
  const walk = (node) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    if (Array.isArray(node)) { node.forEach(walk); return }
    const s = node.sameAs
    if (typeof s === 'string') out.push(s)
    else if (Array.isArray(s)) for (const x of s) if (typeof x === 'string') out.push(x)
    for (const k of Object.keys(node)) walk(node[k])
  }
  walk(nodes)
  return out
}

/**
 * Every address the site publishes for one of the four profile surfaces, and
 * WHERE we read it. The source travels with the URL because a finding that says
 * "your homepage links to your listing" must not be printed about a URL we
 * actually found in the footer of the contact page.
 *
 * `links` is [{ href }], `extra` is bare href strings (iframe sources, sameAs).
 */
export function findProfileLinks(links, base, {
  frames = [], sameAs = [], source = 'your homepage',
} = {}) {
  const out = {}
  const candidates = [
    ...links.map((l) => ({ href: l.href, how: 'a link on the page' })),
    ...frames.map((href) => ({ href, how: 'a Google map embedded in the page' })),
    ...sameAs.map((href) => ({ href, how: 'the sameAs list in its own structured data' })),
  ]
  for (const { href, how } of candidates) {
    let u
    try { u = new URL(href, base) } catch { continue }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
    const isEmbed = embeddedMap(u)
    for (const [key, match] of PROFILE_PATTERNS) {
      if (out[key]) continue
      let hit = false
      try { hit = match(u) } catch { hit = false }
      if (hit) {
        out[key] = {
          url: u.toString(),
          source,
          how: isEmbed && key === 'google-business-profile'
            ? 'a Google map embedded in the page' : how,
        }
      }
    }
    if (!out['google-business-profile'] && isEmbed) {
      out['google-business-profile'] = {
        url: u.toString(), source, how: 'a Google map embedded in the page',
      }
    }
  }
  return out
}

// Every off-site host the page points at, in the order they appear. This is what
// a "we found no link to X" finding QUOTES: the reader can look at the list, see
// their own outbound links in it, and check us.
export function outboundHosts(links, base, limit = 14) {
  const out = []
  let selfHost = ''
  try { selfHost = new URL(base).hostname.replace(/^www\./i, '') } catch { /* keep '' */ }
  for (const { href } of links) {
    let u
    try { u = new URL(href, base) } catch { continue }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
    const h = u.hostname.replace(/^www\./i, '')
    if (!h || h === selfHost || h.endsWith(`.${selfHost}`)) continue
    if (!out.includes(h)) out.push(h)
    if (out.length >= limit) break
  }
  return out
}

// A Google SEARCH url is not a listing. The board carries a Disputed claim that
// came from exactly this confusion, so the scanner refuses to promote one even
// when the homepage links to it.
export function isSearchShaped(url) {
  try {
    const u = new URL(url)
    if (/^\/maps\/search\b/i.test(u.pathname)) return true
    if (/^\/search\b/i.test(u.pathname)) return true
    return u.searchParams.has('q') || u.searchParams.has('query')
  } catch {
    return false
  }
}

// ── WHAT WE LOOKED FOR, WRITTEN DOWN ───────────────────────────────────────
// These are printed on the report, verbatim, beside every finding that reports
// not having found something. A reader who can see the list can check whether
// the word for HIS section is in it — which is the only way "we did not find it"
// can be told apart from "it is not there" by the person who knows the answer.

// Split by how certainly the words mean "start a conversation with us". "Get
// started" is on Wilson Electric's apprenticeship link — "Get Started in the
// Electrical Trade" — and picking the first match in document order printed
// that as their way to start a conversation. A weak match is still a match; it
// just loses to a strong one.
const CONTACT_TERMS_STRONG = [
  'contact', 'get a quote', 'request a quote', 'free quote', 'get an estimate',
  'request an estimate', 'request service', 'talk to us', 'reach us',
  'enquire', 'inquire', 'get in touch',
]
const CONTACT_TERMS_WEAK = ['book', 'schedule', 'get started', 'let us know']
const CONTACT_TERMS = [...CONTACT_TERMS_STRONG, ...CONTACT_TERMS_WEAK]
const asWords = (list) => new RegExp(
  `(${list.map((w) => w.replace(/ /g, '[\\s-]')).join('|')})`, 'i')
const CONTACT_STRONG_RE = asWords(CONTACT_TERMS_STRONG)
const CONTACT_WORDS = asWords(CONTACT_TERMS)

// The best "start here" link on the page: a strong word in the visible text
// beats a strong word in the address, which beats a weak word anywhere, and a
// short label beats a long one at the same strength.
function bestContactLink(links, base) {
  let best = null
  let bestScore = 0
  for (const l of links) {
    const label = String(l.label || '')
    const path = hrefWords(l.href, base)
    let score = 0
    if (CONTACT_STRONG_RE.test(label)) score = 4
    else if (CONTACT_STRONG_RE.test(path)) score = 3
    else if (CONTACT_WORDS.test(label)) score = 2
    else if (CONTACT_WORDS.test(path)) score = 1
    if (!score) continue
    if (score > bestScore ||
      (score === bestScore && best && (label.length || 999) < (best.label.length || 999))) {
      best = { ...l, label, score }
      bestScore = score
    }
  }
  return best
}

// ── PROOF OF WORK, AND WHY THE OLD LIST WAS THE WRONG SHAPE ────────────────
// The old detector was seven words — project, portfolio, our work, case stud,
// gallery, past work, recent work — matched against an anchor's label and href,
// and the finding it produced when they all missed was "NOTHING on the homepage
// links to projects, a portfolio, a gallery or case studies."
//
// Wilson Electric Services, a Tempe commercial electrical contractor, has a hero
// that reads "See what we're capable of…" over seven links to project
// categories, a nav item called Markets, and a section headed Our Service
// Markets. Not one of its seventy-five anchors contains one of the seven words.
// The scan told a stranger, in the largest box on the page, that his portfolio
// did not exist — on a report whose own opening paragraph promises it only says
// what it checked.
//
// Two things were wrong and only the second one generalises:
//
//   1. THE VOCABULARY. Commercial trades do not label their work "portfolio".
//      They label it Markets, Sectors, Industries, or by the sector itself —
//      Higher Education, Aviation, Water | Wastewater. So the list is longer,
//      and split in two.
//   2. THE SHAPE OF THE CLAIM. A finite keyword search returning nothing cannot
//      carry an infinite claim. No list is ever long enough; the next Wilson is
//      a company that calls it "What We've Built". So the finding no longer
//      asserts absence in the world. It asserts what we searched for, across
//      what, and what we read instead — and prints all three.
//
// STRONG terms name work as work. SECTOR terms are how a commercial contractor
// organises the same thing, and are NOT reported as work on the label alone —
// they are opened, and the finding says what was actually behind the door.
const WORK_TERMS_STRONG = [
  'projects', 'project', 'portfolio', 'case study', 'case studies', 'gallery',
  'galleries', 'our work', 'past work', 'recent work', 'featured work',
  'completed work', 'work we have done', 'showcase', 'what we have built',
]
const WORK_TERMS_SECTOR = [
  'markets', 'market', 'sectors', 'sector', 'industries', 'industry',
  'what we build', 'where we work', 'who we serve', 'clients we serve',
]
const WORK_STRONG_RE = new RegExp(
  '\\b(projects?|portfolios?|case\\s?stud(?:y|ies)|galler(?:y|ies)|our\\s?work|' +
  'past\\s?work|recent\\s?work|featured\\s?work|completed\\s?work|showcase|' +
  'work\\s?we(?:\\s?ve|\\s?have)?\\s?done|what\\s?we(?:\\s?ve|\\s?have)?\\s?built)\\b', 'i')
const WORK_SECTOR_RE = new RegExp(
  '\\b(markets?|sectors?|industr(?:y|ies)|what\\s?we\\s?build|where\\s?we\\s?work|' +
  'who\\s?we\\s?serve|clients\\s?we\\s?serve)\\b', 'i')

// A page on the site that tends to carry the social icons the homepage does not.
const CONTACT_PAGE_RE = /\b(contact|about|about\s?us|connect|locations?|our\s?team|company)\b/i

const TEL_RE = /\btel:\s*([+0-9().\s-]{7,})/i
const PHONE_TEXT_RE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/

// An href read the way a person reads a link: slugs are words.
function hrefWords(href, base) {
  let path = String(href || '')
  try { path = new URL(href, base || 'https://x.invalid/').pathname } catch { /* raw */ }
  return decodeURIComponent(path).replace(/[-_/.+]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Every link on the page that might be the way to their work, with the tier it
 * matched at and the text that matched. Returns the search itself as well as
 * its results, because the search is what gets printed when there are none.
 */
// An article is not a portfolio. Pueblo Mechanical's homepage carries a news
// post called "HVAC Project Time Lapse" at /news/733/, and on tier alone that
// beat their /who-we-serve/ index — so the scan opened one blog post and
// reported it as their work section. The word has to be where the SECTION is,
// not only in a headline that happens to contain it.
const ARTICLE_PATH_RE = /(^|\/)(news|blog|articles?|posts?|press|media|updates?|events?)(\/|$)/i

export function findWorkLinks(links, base) {
  const hits = []
  for (const l of links) {
    const path = hrefWords(l.href, base)
    const words = `${l.label} ${path}`
    const strong = WORK_STRONG_RE.exec(words)
    const sector = strong ? null : WORK_SECTOR_RE.exec(words)
    if (!strong && !sector) continue
    let segments = []
    try { segments = new URL(l.href, base).pathname.split('/').filter(Boolean) } catch { segments = [] }
    const inPath = WORK_STRONG_RE.test(path) || WORK_SECTOR_RE.test(path)
    let score = strong ? 100 : 50
    // A section index — /projects, /who-we-serve — over a page inside one.
    if (inPath) score += 30
    score -= Math.min(segments.length, 4) * 8
    if (ARTICLE_PATH_RE.test(`/${segments.join('/')}`)) score -= 70
    // A trailing all-digits segment is an article id, never a section name.
    if (segments.length && /^\d+$/.test(segments[segments.length - 1])) score -= 40
    hits.push({
      href: l.href,
      label: l.label,
      tier: strong ? 'strong' : 'sector',
      matched: (strong || sector)[0],
      score,
    })
  }
  // Best score first; a short nav label beats a long paragraph link at the same
  // score, because that is which one the reader would have clicked.
  hits.sort((a, b) => (b.score - a.score) ||
    ((a.label || a.href).length - (b.label || b.href).length))
  return hits
}

// The labels a person actually sees in the navigation, for quoting back. Long
// enough to be a word, short enough not to be a sentence, de-duplicated.
export function sectionLabels(links, limit = 14) {
  const out = []
  for (const l of links) {
    const label = String(l.label || '').trim()
    if (!label || label.length > 34 || label.length < 2) continue
    if (/^[#\d\s.,|/·—–-]+$/.test(label)) continue
    if (out.some((x) => x.toLowerCase() === label.toLowerCase())) continue
    out.push(label)
    if (out.length >= limit) break
  }
  return out
}

// How many distinct pages BELOW this one, on the same host, it links to. On a
// markets or projects index that number is the section: Wilson Electric's
// /markets/ links to thirteen category pages. It is a count of links, said as a
// count of links — not a count of projects, which we cannot see.
export function countDeeperLinks(links, pageUrl) {
  let base
  try { base = new URL(pageUrl) } catch { return 0 }
  const here = base.pathname.replace(/\/+$/, '')
  const seen = new Set()
  for (const { href } of links) {
    let u
    try { u = new URL(href, base) } catch { continue }
    if (u.hostname !== base.hostname) continue
    const p = u.pathname.replace(/\/+$/, '')
    if (p === here || !p.startsWith(`${here}/`)) continue
    seen.add(p)
  }
  return seen.size
}

function clip(s, n = 160) {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

// ── A FINDING ──────────────────────────────────────────────────────────────
// The receipt rule, in code. A finding that judges the business — good or weak
// — must name the document it read. Without one it is an opinion with a
// confident font, which is the exact thing this product exists not to ship.
//
// ── THE SECOND RULE, WHICH THE WILSON REPORT BROKE ─────────────────────────
// A NEGATIVE CLAIM NEEDS ITS SEARCH THE WAY A JUDGEMENT NEEDS ITS RECEIPT.
//
// "Nothing on the homepage links to projects" is a claim about every link on the
// page. The evidence behind it is always the same and always smaller: one finite
// search returned no rows. The gap between the two is where the Wilson Electric
// report went wrong, and no amount of adding words to the list closes it,
// because the next company labels it something nobody put in the list.
//
// So the sentence is allowed, and it costs something to write: any `found` text
// that reaches for an absolute has to hand over `searched` — what we looked for,
// across what, and what was there instead — and the report prints all of it. A
// reader who knows the answer can then see our search and tell us it was short,
// which is the only correction loop a scanner can honestly offer.
//
// This tripwire is prose-matching on purpose. It is not a proof; it is a thing
// that fires while an author is writing the sentence, in the same file, the way
// the receipt rule does.
const ABSOLUTE_CLAIM = new RegExp([
  '\\bnothing\\b', '\\bnowhere\\b', '\\bnone of\\b', '\\bnot one\\b',
  '\\bthere (?:is|are) no\\b', '\\bwe found no\\b', '\\bno \\w+ was found\\b',
  '\\bdoes not appear\\b', '\\bdo not appear\\b', '\\bnever appears\\b',
  '\\bcarries no\\b', '\\bsets no\\b', '\\bhas no\\b',
  '\\bno (?:phone number|form|link|title|listing)\\b',
].join('|'), 'i')

export function searchRecord({ looked_for, across, read = null, instead = [] }) {
  if (!Array.isArray(looked_for) || !looked_for.length || !across) {
    throw new Error('a search record needs what it looked for and what it looked across')
  }
  return {
    looked_for: looked_for.slice(0, 24),
    across: String(across),
    read: read == null ? null : String(read),
    instead: (instead || []).slice(0, 14),
  }
}

export function finding({
  id, part_key, looked_at, found, costs = null, standing,
  receipt = null, not_verified = null, to_check_this = null, searched = null,
}) {
  if (!['good', 'weak', 'unknown'].includes(standing)) {
    throw new Error(`finding ${id}: standing must be good, weak or unknown`)
  }
  if (!id || !part_key || !looked_at || !found) {
    throw new Error(`finding ${id || '(unnamed)'}: id, part_key, looked_at and found are required`)
  }
  if (standing !== 'unknown' && !(receipt && receipt.url)) {
    throw new Error(
      `finding ${id}: a finding that judges needs a receipt — the address we ` +
      'actually opened. Use standing "unknown" when there is nothing to show.'
    )
  }
  if (standing === 'weak' && !costs) {
    throw new Error(`finding ${id}: a weak finding must say what it costs them`)
  }
  if (ABSOLUTE_CLAIM.test(found) && !searched) {
    throw new Error(
      `finding ${id}: "${(found.match(ABSOLUTE_CLAIM) || [''])[0]}" is a claim about ` +
      'everything we did not look at. Hand it a searchRecord — what you looked ' +
      'for, across what, and what was there instead — or say what you did find.'
    )
  }
  return {
    id,
    part_key,
    surface: SURFACE_NAME[part_key] || part_key,
    group: 'Found by buyers',
    looked_at,
    found,
    costs,
    standing,
    // Mirrors the database's vocabulary: verified means a machine fetched
    // something and the receipt is what it fetched. Nothing else is ever green.
    confidence: receipt && receipt.url ? 'verified' : 'reported',
    receipt,
    not_verified,
    to_check_this,
    searched,
  }
}

function receiptFrom(res, quote = null) {
  const url = res && (res.finalUrl || res.url)
  if (!url) return null
  return {
    url,
    http_status: res.ok ? res.status : null,
    fetched_at: new Date().toISOString(),
    quote: quote ? clip(quote, 240) : null,
  }
}

// ── THE WEBSITE ────────────────────────────────────────────────────────────

function websiteFindings({ res, page, insecure, city, workPage = null }) {
  const out = []
  const url = res.finalUrl || res.url
  const opened = 'Your homepage, opened the way a visitor\'s browser opens it.'
  const receipt = (quote) => receiptFrom(res, quote)
  const linkCount = page.links.length
  const links = linkCount === 1 ? 'one link' : `${linkCount} links`
  const acrossLinks = `every link on your homepage (${linkCount} of them${
    page.linksTruncated ? ', which is where we stopped counting' : ''})`

  // WE ONLY READ THE FIRST N BYTES, AND THAT CHANGES WHAT WE ARE ALLOWED TO
  // SAY. A cap exists so one enormous page cannot eat the clock or the memory
  // — but a page that got cut is a page we have not finished reading, and
  // "there is no phone number on this site" read off two thirds of a document
  // is exactly the wrong claim on exactly the wrong page. Found-it findings
  // survive truncation intact (finding something in part of a page is still
  // finding it). NOT-found findings do not: they drop to unknown and say where
  // we stopped. Caught on the first live scan of a real contractor, whose
  // WordPress homepage is bigger than the cap and does have a phone number.
  const cut = !!res.truncated
  const readSoFar = `the first ${Math.round((res.bytes || 0) / 1000)} KB of your homepage, ` +
    'which is where we stopped reading'

  // A "we did not find it" finding, told honestly whichever way the read went —
  // and never without its search. `searched` is not optional here: finding()
  // throws on an absolute claim that arrives without one, and every caller below
  // is making an absolute claim.
  const absent = ({ id, found, costs, cutTo, how = '', searched }) => (cut
    ? finding({
      id, part_key: 'website', standing: 'unknown',
      looked_at: `${opened}${how} The page is longer than we read, so we looked at ${readSoFar}.`,
      found: `${found} The page continues past where we stopped, so this is not a ` +
        'statement about the whole of it.',
      to_check_this: cutTo,
      searched,
    })
    : finding({ id, part_key: 'website', standing: 'weak', looked_at: `${opened}${how}`,
      found, costs, receipt: receipt(null), searched }))

  // 1. did it answer
  if (res.status >= 400) {
    out.push(finding({
      id: 'website.answered', part_key: 'website', looked_at: opened, standing: 'weak',
      found: `The page answered HTTP ${res.status} in ${res.ms}ms.`,
      costs: 'Every search result, every ad click and every business card that ' +
        'sends someone to this address lands them on an error page. You have ' +
        'already paid for the click.',
      receipt: receipt(page.title || null),
    }))
  } else {
    out.push(finding({
      id: 'website.answered', part_key: 'website', looked_at: opened, standing: 'good',
      found: `The page answered in ${res.ms}ms` +
        (cut
          ? `. We read ${res.bytes.toLocaleString('en-US')} bytes of it and stopped there`
          : `, ${res.bytes.toLocaleString('en-US')} bytes`) +
        (res.redirected ? `, after redirecting to ${url}.` : '.'),
      receipt: receipt(page.title || null),
    }))
  }

  // 2. what it calls itself
  if (page.title) {
    out.push(finding({
      id: 'website.identity', part_key: 'website', looked_at: opened, standing: 'good',
      found: `The page titles itself "${clip(page.title, 120)}". That is the line ` +
        'a buyer reads in a search result before deciding whether to click.',
      receipt: receipt(page.title),
    }))
  } else {
    out.push(absent({
      id: 'website.identity',
      found: 'The page carries no title tag.',
      costs: 'The line a buyer reads in Google before clicking is your bare ' +
        'domain name instead of what you do and where you do it.',
      cutTo: 'Whether the page has a title is one line of its source.',
      searched: searchRecord({
        looked_for: ['<title>'],
        across: 'the source of your homepage',
        read: `${(res.bytes || 0).toLocaleString('en-US')} bytes`,
      }),
    }))
  }

  // 3. secure
  const isHttps = url.startsWith('https:')
  if (!isHttps) {
    out.push(finding({
      id: 'website.secure', part_key: 'website', looked_at: opened, standing: 'weak',
      found: 'The page is served over plain http, not https.',
      costs: 'Chrome and Safari print "Not secure" in the address bar beside ' +
        'your name. On a phone that sits directly above your phone number.',
      receipt: receipt(url),
    }))
  } else if (insecure && insecure.ok) {
    const redirects = insecure.status >= 300 && insecure.status < 400 &&
      String(insecure.location || '').includes('https')
    if (redirects) {
      out.push(finding({
        id: 'website.secure', part_key: 'website', looked_at:
          'Your homepage on both the secure and the plain address.', standing: 'good',
        found: `The site is served over https, and the plain http address ` +
          `answers ${insecure.status} and sends the visitor to the secure one.`,
        receipt: receiptFrom(insecure, insecure.location),
      }))
    } else {
      out.push(finding({
        id: 'website.secure', part_key: 'website', looked_at:
          'Your homepage on both the secure and the plain address.', standing: 'weak',
        found: `The site answers on https, but the plain http address answers ` +
          `${insecure.status} without sending the visitor to the secure one.`,
        costs: 'Anyone who types your domain without https — an old link, a ' +
          'printed card, a saved contact — gets the unencrypted copy and the ' +
          'browser warning that comes with it.',
        receipt: receiptFrom(insecure, insecure.location),
      }))
    }
  } else {
    // The secure page answered but the plain-http probe did not come back. Say
    // so. A missing check that quietly emits no finding reads, to anyone
    // counting the surfaces, exactly like a check that passed.
    out.push(finding({
      id: 'website.secure', part_key: 'website', standing: 'unknown',
      looked_at: 'Your homepage on the plain http address.',
      found: 'The secure address answered. We could not get an answer on the ' +
        `plain http address (${insecure ? insecure.error : 'no answer'}), so ` +
        'whether an old link without https still reaches you is not checked here.',
      to_check_this: 'Typing the domain without https, once.',
    }))
  }

  // 4. phone
  const telLink = page.links.find((l) => TEL_RE.test(l.href))
  // The page a person reads is wider than its text nodes: a number can sit in a
  // header image's alt, in an aria-label on a call button, or in the site's own
  // structured data. Searching only `page.text` and then reporting that no
  // number exists is the same mistake in a smaller box.
  const phoneHaystack = `${readableSurface(page)} ${JSON.stringify(page.jsonld || [])}`
  const phoneInText = phoneHaystack.match(PHONE_TEXT_RE)
  const phoneSearch = searchRecord({
    looked_for: ['tel: links', 'a 10-digit number in the page text, its captions or its own structured data'],
    across: acrossLinks + ', and everything on the page a person reads',
    read: `${(res.bytes || 0).toLocaleString('en-US')} bytes`,
  })
  if (telLink) {
    out.push(finding({
      id: 'website.phone', part_key: 'website', looked_at: opened, standing: 'good',
      found: `A tappable phone number is on the homepage: ${clip(telLink.href, 60)}`,
      receipt: receipt(telLink.href),
    }))
  } else if (phoneInText) {
    // The number IS there — that half survives a truncated read. What does not
    // is "and nowhere on the page is it a link", so a cut page says so.
    out.push(cut
      ? finding({
        id: 'website.phone', part_key: 'website', standing: 'unknown',
        looked_at: `${opened} We looked at ${readSoFar}.`,
        found: `A phone number appears as text (${phoneInText[0]}) and none of the ` +
          'links in the part of the page we read is a tel: link. The page ' +
          'continues past that point, so this is not a statement about the whole of it.',
        to_check_this: 'Tapping the number on your own homepage from a phone.',
        searched: phoneSearch,
      })
      : finding({
        id: 'website.phone', part_key: 'website', looked_at: opened, standing: 'weak',
        found: `A phone number appears on the page as text (${phoneInText[0]}) and ` +
          `none of its ${links} is a tel: link, so tapping the ` +
          'number on a phone does nothing.',
        costs: 'On a phone the number has to be read, remembered and typed before ' +
          'it can be dialled. That is the step where a caller tries the next ' +
          'company on the list instead.',
        receipt: receipt(phoneInText[0]),
        searched: phoneSearch,
      }))
  } else {
    out.push(absent({
      id: 'website.phone',
      found: 'We found no phone number on the homepage: no tel: link among its ' +
        `${links}, and no ten-digit number in its text, its captions ` +
        'or its own structured data.',
      costs: 'The buyer who has already decided to call you has nowhere to call ' +
        'from without hunting for it.',
      cutTo: 'Looking at the rest of your own homepage settles it.',
      searched: phoneSearch,
    }))
  }

  // 5. a next action
  //
  // BY THE LABEL FIRST, AND SAY WHICH ONE MATCHED. On Wilson Electric the only
  // match was the HREF /contact/ behind a link whose text is "Locations", and
  // the finding printed: the homepage offers a way to start: "Locations". The
  // quote has to be the thing that matched, or the receipt is decoration.
  const contactLink = bestContactLink(page.links, url)
  const byLabel = contactLink && contactLink.score >= 2 ? contactLink : null
  const hasForm = page.forms > 0 && page.inputs > 0
  const contactSearch = searchRecord({
    looked_for: CONTACT_TERMS,
    across: `${acrossLinks}, in the text of each link and in its address, and any form on the page`,
  })
  if (contactLink || hasForm) {
    out.push(finding({
      id: 'website.next_action', part_key: 'website', looked_at: opened, standing: 'good',
      found: byLabel
        ? `The homepage offers a way to start: a link reading "${clip(byLabel.label, 60)}".`
        : (contactLink
          ? `The homepage offers a way to start: a link to ${clip(contactLink.href, 70)}` +
            (contactLink.label ? `, which reads "${clip(contactLink.label, 40)}".` : '.')
          : `The homepage carries a form with ${page.inputs} fields.`),
      receipt: receipt(contactLink ? contactLink.href : `${page.forms} form(s), ${page.inputs} fields`),
    }))
  } else {
    out.push(absent({
      id: 'website.next_action',
      found: `We found no form on the homepage, and none of its ${links} ` +
        'offers contact, a quote or an estimate in its text or its address.',
      costs: 'A general contractor building a bid list has no way to start a ' +
        'conversation without leaving the page. He does not leave the page. He ' +
        'closes the tab.',
      cutTo: 'Whether there is a contact link below where we stopped.',
      searched: contactSearch,
    }))
  }

  // 6. proof of work — see the long note above WORK_TERMS_STRONG for what this
  // got wrong on a real prospect and why the shape of the claim changed, not
  // just the length of the list.
  const workHits = findWorkLinks(page.links, url)
  const workSearch = searchRecord({
    looked_for: [...WORK_TERMS_STRONG, ...WORK_TERMS_SECTOR],
    across: `${acrossLinks}, in the text of each link and in its address`,
    instead: sectionLabels(page.links),
  })
  const bestWork = workHits[0] || null

  if (workPage && workPage.ok && workPage.page && bestWork) {
    // WE OPENED IT. Which turns a guess about a label into a fact about a page.
    const wp = workPage.page
    const deeper = countDeeperLinks(wp.links, workPage.url)
    out.push(finding({
      id: 'website.proof_of_work', part_key: 'website', standing: 'good',
      looked_at: `Your homepage, and then the page behind "${clip(bestWork.label || bestWork.href, 50)}".`,
      found: `Your homepage points at "${clip(bestWork.label || bestWork.href, 50)}". ` +
        `We opened it: it titles itself "${clip(wp.title || '(no title)', 80)}" and ` +
        `carries ${wp.images} image${wp.images === 1 ? '' : 's'}` +
        (deeper
          ? `, and it links to ${deeper} further page${deeper === 1 ? '' : 's'} below it.`
          : '. We counted 0 links from it into pages below it, so it reads as a ' +
            'single page rather than an index of work.'),
      receipt: receiptFrom(workPage.res, wp.title || null),
      not_verified: 'How recent that work is, what it cost and whether any of it ' +
        'is the size of the job a particular buyer is bidding is not on the page ' +
        'in a form we can read, so it is not checked here.',
    }))
  } else if (bestWork && bestWork.tier === 'strong') {
    out.push(finding({
      id: 'website.proof_of_work', part_key: 'website', looked_at: opened, standing: 'good',
      found: `The homepage links to work: "${clip(bestWork.label || bestWork.href, 60)}"` +
        `${workHits.length > 1 ? `, and ${workHits.length - 1} other link${workHits.length === 2 ? '' : 's'} like it` : ''}.`,
      receipt: receipt(bestWork.href),
      not_verified: 'We did not open it, so what is behind that link — how many ' +
        'projects, at what size, how recent — is not checked here.',
    }))
  } else if (bestWork) {
    // A SECTOR LABEL IS NOT A PORTFOLIO AND IS NOT ITS ABSENCE. "Markets",
    // "Industries", "Sectors" is how a commercial contractor files its work, and
    // it is also how one files a list of services it would like to sell. We did
    // not open it, so we say that instead of picking.
    out.push(finding({
      id: 'website.proof_of_work', part_key: 'website', standing: 'unknown',
      looked_at: `${opened} We searched every link on it for the words a company ` +
        'uses for its own work.',
      found: `No link on the homepage is labelled or addressed as projects, a ` +
        `portfolio, a gallery or case studies. It does point at ` +
        `"${clip(bestWork.label || bestWork.href, 50)}", which is how a commercial ` +
        'contractor often files the same thing — and we did not get to open it, ' +
        'so what is behind it is not checked here.',
      to_check_this: 'Opening that section and seeing whether it names finished ' +
        'jobs or lists services.',
      searched: workSearch,
    }))
  } else {
    out.push(absent({
      id: 'website.proof_of_work',
      found: 'We found no link to your work on the homepage: none of its ' +
        `${links} is labelled or addressed as projects, a portfolio, ` +
        'a gallery, case studies, markets, sectors or industries.',
      costs: 'The only question a buyer has is whether you have done his job at ' +
        'his size before. This page asks him to take that on faith.',
      cutTo: 'Whether there is a projects link below where we stopped.',
      searched: workSearch,
    }))
  }

  // 7. mobile
  if (page.viewport) {
    out.push(finding({
      id: 'website.mobile', part_key: 'website', looked_at: opened, standing: 'good',
      found: `The page sets a mobile viewport, so a phone lays it out for a phone.`,
      receipt: receipt(page.viewport),
      not_verified: 'The tag being present is not the same as the layout being ' +
        'right on a phone. We read the page, we did not render it.',
    }))
  } else {
    out.push(absent({
      id: 'website.mobile',
      found: 'The page sets no mobile viewport tag, so a phone renders it at ' +
        'desktop width and shrinks it to fit.',
      costs: 'A superintendent looking you up from the truck gets a page he has ' +
        'to pinch and zoom to read. What he is zooming to find is your number.',
      cutTo: 'The viewport tag sits in the head of the page, one line of source.',
      searched: searchRecord({
        looked_for: ['<meta name="viewport">'],
        across: 'the source of your homepage',
        read: `${(res.bytes || 0).toLocaleString('en-US')} bytes`,
      }),
    }))
  }

  // 8. does it say what market it is in
  out.push(marketFinding({ page, receipt, term: 'commercial', id: 'website.names_commercial',
    opened, absent,
    weakCost: 'A commercial buyer scanning your homepage is looking for one ' +
      'word to know he is in the right place. Without it he reads you as a ' +
      'residential company and moves on, whatever your actual work looks like.',
  }))
  if (city) {
    out.push(marketFinding({ page, receipt, term: city, id: 'website.names_city', opened, absent,
      weakCost: `A buyer searching for your trade in ${city} has nothing on this ` +
        'page telling him you cover it, and neither does a search engine reading ' +
        'the same page.',
    }))
  }

  return out
}

// Literal string presence, and the finding SAYS it is literal string presence.
// This is the honest version of "does the site identify its market": we do not
// judge whether they serve commercial work, we report whether the word is on
// the page a buyer reads.
// WHERE "ANYWHERE" WAS TOO BIG A WORD. This searched `page.text` — the text
// nodes only — and then reported that the word "does not appear ANYWHERE in the
// homepage text". Wilson Electric's hero image carries the alt "Commercial
// Electrical Contractor in Phoenix"; on a site whose visible copy happened not
// to repeat it, that claim would have been false about a page with the word on
// it twice. The haystack is now everything a person reads — the copy, the title,
// the image captions, the button labels and the description a search engine is
// handed — and the sentence names the haystack instead of implying the page.
function marketFinding({ page, receipt, term, id, opened, weakCost, absent }) {
  const hay = readableSurface(page)
  const how = ` We searched the homepage copy, its title, its image captions and ` +
    `its search-engine description for the word "${term}".`
  const i = hay.toLowerCase().indexOf(String(term).toLowerCase())
  if (i >= 0) {
    const around = hay.slice(Math.max(0, i - 60), i + String(term).length + 60)
    return finding({
      id, part_key: 'website', standing: 'good',
      looked_at: `${opened}${how}`,
      found: `"${term}" appears on the homepage: "…${clip(around, 140)}…"`,
      receipt: receipt(around),
    })
  }
  return absent({
    id,
    how,
    found: `The word "${term}" does not appear in the homepage copy, its title, ` +
      'its image captions or its search-engine description.',
    costs: weakCost,
    cutTo: `Whether "${term}" appears below where we stopped reading.`,
    searched: searchRecord({
      looked_for: [`the word "${term}"`],
      across: 'the homepage copy, its title, its image captions and its ' +
        'search-engine description',
      read: `${hay.length.toLocaleString('en-US')} characters of readable text`,
    }),
  })
}

// ── THE PROFILES ───────────────────────────────────────────────────────────
// Everything here is about a page we did NOT write and mostly cannot read.
// Google Maps draws its listing in the browser; LinkedIn answers a bot with
// 999; Yelp answers with a challenge. Fetching them proves the address the
// homepage publishes is live. It does not prove anything about the contents,
// and this file says so in every one of those cases rather than quietly
// implying it read something.

const CANNOT_READ = {
  'google-business-profile':
    'We did not read the listing itself. Google Maps draws its contents in the ' +
    'browser, so the page a fetch returns is empty of them — hours, categories, ' +
    'photos and the review count are not checked here.',
  yelp: 'We did not read the page contents. Yelp answers automated requests with ' +
    'a challenge rather than the page.',
  'company-linkedin': 'We did not read the page contents. LinkedIn answers ' +
    'automated requests with a refusal rather than the page.',
  'owners-linkedin': 'We did not read the profile contents. LinkedIn answers ' +
    'automated requests with a refusal rather than the page.',
}

const NO_LINK = {
  'google-business-profile': {
    what: 'a Google listing',
    tail: 'That is not proof you do not have one — it is proof a buyer on your ' +
      'site cannot reach it in one tap. We do not count a Google search result ' +
      'as a listing, so we are not going to show you one and call it yours.',
    ask: 'The Maps link for your listing, copied from the address bar. That is ' +
      'the one thing this scan cannot get on its own.',
    shapes: ['google.com/maps/…', 'g.page/…', 'g.co/kgs/…', 'goo.gl/maps/…',
      'maps.app.goo.gl/…', 'an embedded Google map', 'sameAs in your page data'],
  },
  yelp: {
    what: 'a Yelp page',
    tail: 'Whether one exists is not something this scan checked.',
    ask: 'The address of your Yelp page, if you have one.',
    shapes: ['yelp.com/biz/…', 'sameAs in your page data'],
  },
  'company-linkedin': {
    what: 'a company LinkedIn page',
    tail: '',
    ask: 'The address of your company page on LinkedIn.',
    shapes: ['linkedin.com/company/…', 'linkedin.com/showcase/…', 'sameAs in your page data'],
  },
  'owners-linkedin': {
    what: "an owner's LinkedIn profile",
    tail: '',
    ask: "The owner's LinkedIn profile address.",
    shapes: ['linkedin.com/in/…', 'linkedin.com/pub/…', 'sameAs in your page data'],
  },
}

function profileFinding(partKey, found, res) {
  const url = found.url
  const where = found.source === 'your homepage'
    ? 'your homepage'
    : found.source
  const looked = `The address ${where} publishes for this: ${url}`
  if (isSearchShaped(url)) {
    return finding({
      id: `${partKey}.search_link`, part_key: partKey, standing: 'unknown',
      looked_at: looked,
      found: `The link on ${where} is a SEARCH, not a page. It runs a query ` +
        'and shows whatever comes back, which is not the same as a listing you ' +
        'own and control.',
      to_check_this: 'The address of the listing itself, copied from the address bar.',
    })
  }
  if (!res || !res.ok) {
    return finding({
      id: `${partKey}.unreachable`, part_key: partKey, standing: 'unknown',
      looked_at: looked,
      found: `We opened it and it did not answer: ${res ? res.error : 'we ran out of time'}. ` +
        'That may be them refusing an automated request rather than anything ' +
        'wrong with the page, so we are not calling it broken.',
      to_check_this: 'Opening it by hand takes a second and settles it.',
    })
  }
  if (res.status >= 400) {
    return finding({
      id: `${partKey}.broken_link`, part_key: partKey, standing: 'unknown',
      looked_at: looked,
      found: `We opened it and it answered HTTP ${res.status}. Several of these ` +
        'platforms answer automated requests that way whether or not the page ' +
        'is fine, so this is not evidence the link is dead.',
      to_check_this: 'Clicking the link on your own homepage settles it in a second.',
    })
  }
  // A SHORT LINK CAN LAND ON A SEARCH. goo.gl/maps/… and maps.app.goo.gl/… hide
  // where they go until the redirect resolves, and the board already carries one
  // Disputed claim from calling a Google search a listing. The hop we ended on
  // gets the same test as the one we started from.
  const final = res.finalUrl || res.url || url
  if (isSearchShaped(final)) {
    return finding({
      id: `${partKey}.search_link`, part_key: partKey, standing: 'unknown',
      looked_at: looked,
      found: `We opened it and it lands on a SEARCH rather than a page: ${clip(final, 120)}. ` +
        'A query that shows whatever comes back is not a listing you own and control.',
      to_check_this: 'The address of the listing itself, copied from the address bar.',
    })
  }
  return finding({
    id: `${partKey}.linked`, part_key: partKey, standing: 'good',
    looked_at: looked,
    found: `${found.source === 'your homepage' ? 'Your homepage' : `The ${found.source}`} ` +
      `points at it through ${found.how}, and it answered HTTP ${res.status} when ` +
      'we opened it.',
    receipt: receiptFrom(res),
    not_verified: CANNOT_READ[partKey] || null,
  })
}

// WE LOOKED HERE, FOR THIS, AND THIS IS WHAT WAS THERE INSTEAD. The old sentence
// — "We found no link to a Google listing anywhere on your homepage" — was
// already hedged the right way, but the reader had no way to check it. Now it
// names the pages we read, the address shapes we looked for, and the off-site
// hosts we did find, so a company that publishes its LinkedIn somewhere we did
// not look can see exactly where we did.
function noLinkFinding(partKey, { pagesRead, hosts }) {
  const copy = NO_LINK[partKey]
  // The hosts we DID read live in the search record and nowhere else. Printed
  // in the sentence as well they were the same twelve words in two type
  // treatments on three consecutive cards, which is how a reader learns that
  // the evidence block is decoration.
  return finding({
    id: `${partKey}.not_linked`, part_key: partKey, standing: 'unknown',
    looked_at: `Every link on ${pagesRead.length === 1 ? 'your homepage' : `the ${pagesRead.length} pages of your site we read`}.`,
    found: `We found no link to ${copy.what} on ${pagesRead.length === 1
      ? 'your homepage'
      : `your homepage or the ${pagesRead.length - 1} other page${pagesRead.length === 2 ? '' : 's'} of your site we opened`}` +
      `.${copy.tail ? ` ${copy.tail}` : ''}`,
    to_check_this: copy.ask,
    searched: searchRecord({
      looked_for: copy.shapes,
      across: pagesRead.join(', '),
      instead: hosts.length ? hosts : ['no off-site links at all'],
    }),
  })
}

// The public places a buyer reads reviews, out of what the site already points
// at. Both draw their contents in the browser, so this is a fact about the
// LINKS and says so — it is never turned into a count or a rating.
const REVIEW_PLACES = {
  'google-business-profile': 'your Google listing',
  yelp: 'Yelp',
}
function reviewLinks(profiles) {
  return Object.keys(REVIEW_PLACES)
    .filter((k) => profiles[k] && !isSearchShaped(profiles[k].url))
    .map((k) => ({ name: REVIEW_PLACES[k], url: profiles[k].url }))
}

// ── AI ANSWERS: THE HALF OF IT THAT CAN BE READ FROM OUTSIDE ───────────────
// Whether an assistant NAMES a company when somebody asks for its trade needs a
// prompt run against the assistants, and this scan does not do that. It said so,
// emitted nothing else, and the surface has been a dead row on every report.
//
// But there is a fact about the same question that IS readable from outside, in
// one small file at a fixed address: whether the site's own robots.txt tells the
// assistants' crawlers to stay out. A company that blocks GPTBot and then asks
// why ChatGPT never mentions it has the answer in its own repository. That is a
// literal fact about a document we fetched, with a receipt, and it is exactly
// the shape everything else in this file is.
//
// It is NOT the whole question and the finding never pretends it is: the
// unknown one sits beside it, unchanged.
const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web',
  'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended',
  'CCBot', 'Bytespider', 'Amazonbot', 'meta-externalagent',
]

/**
 * The robots.txt groups that name an assistant's crawler and disallow the root.
 * Deliberately narrow: only `Disallow: /` counts, because a rule blocking one
 * folder is not a rule blocking the site, and reporting it as one would be the
 * same overreach in a new place.
 */
export function readRobots(body) {
  const lines = String(body || '').split(/\r?\n/)
  let agents = []
  let lastWasAgent = false
  const blocked = new Set()
  const seenAgents = new Set()
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) { agents = []; lastWasAgent = false; continue }
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim()
    if (key === 'user-agent') {
      if (!lastWasAgent) agents = []
      agents.push(value)
      seenAgents.add(value)
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (key !== 'disallow') continue
    if (value !== '/') continue
    for (const a of agents) {
      const hit = AI_CRAWLERS.find((c) => c.toLowerCase() === a.toLowerCase())
      if (hit) blocked.add(hit)
      else if (a === '*') blocked.add('*')
    }
  }
  return { blocked: [...blocked], agents: [...seenAgents] }
}

// Only a file that is actually a robots file. A host that answers 200 with its
// homepage for every unknown path — which is most WordPress sites with a broken
// rewrite — must not be read as "your robots.txt allows everything".
export function looksLikeRobots(body) {
  const head = String(body || '').slice(0, 4000)
  if (/<html|<!doctype/i.test(head)) return false
  return /^\s*user-agent\s*:/im.test(head)
}

function aiCrawlerFinding(res) {
  const looked = 'The robots.txt file at the root of your own site — the file that ' +
    'tells crawlers what they may read.'
  const notWhole = 'Whether an assistant actually names you when somebody asks for ' +
    'your trade in your city is a different question, and it is the one below. ' +
    'This is only what your own site tells their crawlers.'
  if (!res || !res.ok) {
    return finding({
      id: 'ai-answers.crawlers', part_key: 'ai-answers', standing: 'unknown',
      looked_at: looked,
      found: `We could not read it: ${res ? res.error : 'we ran out of time'}. ` +
        'What your site tells the assistants\' crawlers is not checked here.',
      to_check_this: 'Opening yourdomain.com/robots.txt in a browser.',
    })
  }
  if (res.status >= 400) {
    return finding({
      id: 'ai-answers.crawlers', part_key: 'ai-answers', standing: 'good',
      looked_at: looked,
      found: `Your site has no robots.txt — the address answered HTTP ${res.status}. ` +
        'With no file there, nothing on your side tells any crawler, including ' +
        'the assistants\', to stay out.',
      receipt: receiptFrom(res),
      not_verified: notWhole,
      searched: searchRecord({
        looked_for: ['/robots.txt'],
        across: 'the root of your own domain',
        read: `HTTP ${res.status}`,
      }),
    })
  }
  if (!looksLikeRobots(res.body)) {
    return finding({
      id: 'ai-answers.crawlers', part_key: 'ai-answers', standing: 'unknown',
      looked_at: looked,
      found: 'That address answered, but what came back is a web page rather than ' +
        'a robots file: we looked for a "User-agent:" line in it and found none. ' +
        'We did not read crawler rules out of a document that has none, so what ' +
        'your site tells the assistants is not checked here.',
      to_check_this: 'Opening yourdomain.com/robots.txt in a browser.',
      searched: searchRecord({
        looked_for: ['a line beginning "User-agent:"'],
        across: 'what your domain answered at /robots.txt',
        read: 'the first 4,000 characters of it',
      }),
    })
  }
  const { blocked, agents } = readRobots(res.body)
  const named = blocked.filter((b) => b !== '*')
  if (blocked.includes('*')) {
    return finding({
      id: 'ai-answers.crawlers', part_key: 'ai-answers', standing: 'weak',
      looked_at: looked,
      found: 'Your robots.txt disallows the whole site to every crawler ' +
        '(User-agent: * / Disallow: /). That is the rule the assistants read too.',
      costs: 'The file at the root of your own site is telling every machine that ' +
        'indexes the web, search engines included, not to read you. Whatever else ' +
        'is on the site cannot be found by anything that obeys it.',
      receipt: receiptFrom(res, 'User-agent: * Disallow: /'),
      not_verified: notWhole,
    })
  }
  if (named.length) {
    return finding({
      id: 'ai-answers.crawlers', part_key: 'ai-answers', standing: 'weak',
      looked_at: looked,
      found: `Your robots.txt disallows the whole site to ${named.length} ` +
        `assistant crawler${named.length === 1 ? '' : 's'}: ${named.join(', ')}.`,
      costs: 'When a buyer asks an assistant who does your trade in your city, the ' +
        'assistants that obey this file have never read your site and answer with ' +
        'somebody who let them in.',
      receipt: receiptFrom(res, named.map((n) => `User-agent: ${n} / Disallow: /`).join(' · ')),
      not_verified: notWhole,
    })
  }
  return finding({
    id: 'ai-answers.crawlers', part_key: 'ai-answers', standing: 'good',
    looked_at: looked,
    found: `Your robots.txt names ${agents.length} crawler group` +
      `${agents.length === 1 ? '' : 's'} and blocks the site to none of the ` +
      'assistants\' crawlers.',
    receipt: receiptFrom(res, agents.slice(0, 8).join(', ')),
    not_verified: notWhole,
    searched: searchRecord({
      looked_for: AI_CRAWLERS,
      across: 'your robots.txt, for a group naming one of them with Disallow: /',
      instead: agents.slice(0, 12),
    }),
  })
}

// ── THE SCAN ───────────────────────────────────────────────────────────────

// "wolfpackcompanies.com" is what a person types. Everything else is us.
export function normaliseWebsite(raw) {
  const s = String(raw == null ? '' : raw).trim()
  if (!s) return { error: 'A website address is required.' }
  if (s.length > 300) return { error: 'That address is too long to be a website.' }
  let withScheme = s
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) withScheme = `https://${s}`
  let u
  try {
    u = new URL(withScheme)
  } catch {
    return { error: 'That is not a web address.' }
  }
  // Always try the secure address first, whatever was typed. If it does not
  // answer we fall back to plain http and say so — which is a finding, not a
  // silent downgrade.
  const secure = new URL(u.toString())
  secure.protocol = 'https:'
  secure.hash = ''
  const problem = urlProblem(secure.toString())
  if (problem) return { error: problem }
  const insecure = new URL(secure.toString())
  insecure.protocol = 'http:'
  insecure.pathname = '/'
  insecure.search = ''
  const robots = new URL(secure.toString())
  robots.pathname = '/robots.txt'
  robots.search = ''
  return {
    url: secure.toString(),
    insecureProbe: insecure.toString(),
    robots: robots.toString(),
  }
}

/**
 * The two pages of the prospect's OWN site worth one fetch each: the one their
 * work is behind, and the one their social links are usually on. Same host only
 * — a link to a supplier's site is not their contact page — and never the
 * homepage again.
 */
export function pickInternalPages(links, homeUrl) {
  let base
  try { base = new URL(homeUrl) } catch { return [] }
  const home = base.pathname.replace(/\/+$/, '') || '/'
  const sameHost = []
  for (const l of links) {
    let u
    try { u = new URL(l.href, base) } catch { continue }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') continue
    if (u.hostname.replace(/^www\./i, '') !== base.hostname.replace(/^www\./i, '')) continue
    const path = u.pathname.replace(/\/+$/, '') || '/'
    if (path === home || path === '/') continue
    if (urlProblem(u.toString())) continue
    u.hash = ''
    sameHost.push({ url: u.toString(), label: l.label, path, words: `${l.label} ${hrefWords(l.href, base)}` })
  }
  const out = []
  const taken = new Set()
  const take = (pick, kind, why) => {
    if (!pick || taken.has(pick.url)) return
    taken.add(pick.url)
    out.push({ url: pick.url, kind, why })
  }

  const work = findWorkLinks(sameHost.map((x) => ({ href: x.url, label: x.label })), base.toString())
  if (work.length) {
    const chosen = sameHost.find((x) => x.url === work[0].href)
    take(chosen, 'work', work[0].label ? `the "${clip(work[0].label, 30)}" section` : 'their work section')
  }
  // The shortest path that reads as contact or about — /contact/ beats
  // /about/leadership/contact-the-team/.
  const contact = sameHost
    .filter((x) => CONTACT_PAGE_RE.test(x.words))
    .sort((a, b) => a.path.length - b.path.length)[0]
  take(contact, 'contact', 'their contact page')

  return out.slice(0, MAX_INTERNAL_FETCHES)
}

/**
 * The whole scan, on one clock.
 *
 * `fetchImpl` exists so the timebox can be tested against a target that never
 * answers without waiting ten real seconds for it, and for no other reason.
 * Production passes nothing and gets fetchPublic.
 */
export async function scan({
  company, website, city = null, budgetMs = TOTAL_BUDGET_MS,
  fetchImpl = fetchPublic, fetchOnceImpl = fetchOnce, now = Date.now,
  onProgress = null,
} = {}) {
  const startedAt = now()
  const deadline = startedAt + budgetMs
  const normal = normaliseWebsite(website)
  if (normal.error) throw new BlockedTarget(normal.error)

  // ── WATCHING IT HAPPEN, WITHOUT LYING ABOUT WHEN ─────────────────────────
  // The report page shows each surface resolving. That is only allowed to be
  // an animation if it is also a fact, so the resolution is announced HERE,
  // at the moment the surface actually settles, carrying the millisecond it
  // settled on OUR clock. A caller that renders `at_ms` is drawing the real
  // sequence; nothing downstream has to invent a delay, and nothing downstream
  // is able to, because the number is measured before it leaves this function.
  //
  // Emitting never changes the result: the same object is pushed into the
  // stream and returned in `surfaces` at the end. A stream that fails to reach
  // the browser costs the animation, not the report.
  const emit = (event, data) => {
    if (!onProgress) return
    try { onProgress({ event, at_ms: now() - startedAt, ...data }) } catch { /* never break a scan for its own narration */ }
  }
  // The stamp goes ON the surface, not just into the event, so a saved report
  // still carries the real sequence months later. A report page that has to
  // show "the homepage answered at 1.2s, the profiles at 3.4s" from a stored
  // document cannot measure that itself, and the only alternative to storing it
  // is inventing it.
  const settled = (s) => {
    s.at_ms = now() - startedAt
    emit('surface', { surface: s })
  }

  let fetches = 0
  // TRUE the moment OUR clock cut something short, as opposed to a site
  // refusing us or answering badly. The two are different facts and the report
  // has to be able to tell them apart: one is a finding about them, the other
  // is a disclaimer about us.
  let clockRanOut = false
  const budgetLeft = () => deadline - now()
  const canFetch = () => fetches < MAX_FETCHES && budgetLeft() > 400
  const note = (r) => {
    if (r && r.kind === 'timeout') clockRanOut = true
    return r
  }

  const surfaces = new Map(SURFACES.map(([key, name]) => [key, {
    part_key: key, name, group: 'Found by buyers',
    looked_at: null, status: 'not_looked', note: null, findings: [],
  }]))

  emit('open', {
    company: company || null,
    city: city || null,
    website: { requested: String(website), opened: normal.url },
    budget_ms: budgetMs,
    surfaces: [...surfaces.values()].map((s) => ({ part_key: s.part_key, name: s.name })),
  })

  // ── wave 1: the homepage, the plain-http probe and robots.txt, together ──
  emit('wave', {
    wave: 1,
    doing: 'Opening the homepage the way a visitor\'s browser opens it, and the ' +
      'robots file that tells crawlers what they may read.',
  })
  fetches += 3
  const [home, insecure, robots] = await Promise.all([
    fetchImpl(normal.url, {
      timeoutMs: Math.min(HOMEPAGE_MS, budgetLeft()), maxBytes: HOMEPAGE_BYTES, deadline,
    }).then(note).catch((e) => ({ ok: false, kind: 'blocked', url: normal.url, error: String(e.message || e) })),
    fetchOnceImpl(normal.insecureProbe, {
      timeoutMs: Math.min(2500, budgetLeft()), maxBytes: 4000,
    }).then(note).catch((e) => ({ ok: false, kind: 'blocked', error: String(e.message || e) })),
    fetchImpl(normal.robots, {
      timeoutMs: Math.min(2500, budgetLeft()), maxBytes: ROBOTS_BYTES, deadline,
    }).then(note).catch((e) => ({ ok: false, kind: 'blocked', url: normal.robots, error: String(e.message || e) })),
  ])

  // WE REFUSED THE ADDRESS THEY TYPED. That is not a finding about a website,
  // it is an answer to the request, and it belongs in the response as one.
  //
  // urlProblem() cannot see this case: "localtest.me" and "127.0.0.1.nip.io"
  // are well-formed public domain names, and only the resolver knows they
  // point at loopback. Verified on production — both come back refused with
  // the address named. Left as a 200 with a note on the website surface, that
  // refusal reads like the prospect's site was down, which is a lie about them
  // to cover a decision of ours.
  //
  // A redirect hop that lands somewhere internal is deliberately NOT this: we
  // opened the address they gave us, and where it sent us next is a fact about
  // their site. `hops` tells the two apart.
  if (home.kind === 'blocked' && !(home.hops && home.hops.length > 1)) {
    throw new BlockedTarget(home.error)
  }

  // If the secure address did not answer at all, try plain http before giving
  // up on the whole site — a trades company on a 2013 host is a real case, and
  // "we could not reach you" when the site is up and unencrypted is both wrong
  // and the wrong finding. The finding it produces is the http one.
  let res = home
  if (!home.ok && canFetch()) {
    fetches += 1
    const plain = await fetchImpl(normal.insecureProbe, {
      timeoutMs: Math.min(SECONDARY_MS, budgetLeft()), maxBytes: HOMEPAGE_BYTES, deadline,
    }).then(note).catch((e) => ({ ok: false, kind: 'blocked', error: String(e.message || e) }))
    if (plain.ok && plain.status < 400) res = plain
  }

  const site = surfaces.get('website')
  site.looked_at = normal.url

  let page = null
  let profiles = {}
  let pagesRead = []
  let outbound = []
  let workPage = null
  const gibberish = res.ok ? unreadableBody(res) : null
  const readable = res.ok && !gibberish
  if (readable) {
    page = readHtml(res.body)
    const homeUrl = res.finalUrl || res.url
    pagesRead = ['your homepage']
    outbound = outboundHosts(page.links, homeUrl)
    profiles = findProfileLinks(page.links, homeUrl, {
      frames: page.frames, sameAs: sameAsUrls(page.jsonld), source: 'your homepage',
    })

    // ── wave 2: two pages of THEIR OWN SITE ────────────────────────────────
    //
    // WHY THIS WAVE EXISTS. Six of seven surfaces were coming back "not checked
    // here" on every report, and the scan was finishing in under two seconds
    // against a nine second budget. It was not out of time; it had only ever
    // looked at one document.
    //
    // Two pages, chosen for two different reasons:
    //   the work page  — so proof of work stops being a guess about a LABEL and
    //                    becomes a fact about a PAGE. This is the Wilson fix.
    //   contact/about  — because a company that never puts its LinkedIn in the
    //                    homepage footer very often puts it there.
    //
    // Same-host only, and every hop still goes through the SSRF guard: these are
    // ordinary fetchImpl calls and nothing about them is trusted because the
    // link came from a page we read.
    const internals = pickInternalPages(page.links, homeUrl)
    if (internals.length && canFetch() && budgetLeft() > 1200) {
      emit('wave', {
        wave: 2,
        doing: `Opening ${internals.length} page${internals.length === 1 ? '' : 's'} ` +
          'of their own site: ' + internals.map((x) => x.why).join(', ') + '.',
      })
      const opened = await Promise.all(internals.map((target) => {
        if (!canFetch()) return Promise.resolve(null)
        fetches += 1
        return fetchImpl(target.url, {
          timeoutMs: Math.min(INTERNAL_MS, budgetLeft()),
          maxBytes: INTERNAL_BYTES, deadline,
        })
          .then(note)
          .catch((e) => ({ ok: false, kind: 'blocked', error: String(e.message || e) }))
          .then((r) => ({ target, res: r }))
      }))
      for (const got of opened) {
        if (!got || !got.res || !got.res.ok || got.res.status >= 400) continue
        if (unreadableBody(got.res)) continue
        const p = readHtml(got.res.body)
        const at = got.res.finalUrl || got.res.url || got.target.url
        pagesRead.push(got.target.why)
        for (const h of outboundHosts(p.links, at)) if (!outbound.includes(h)) outbound.push(h)
        const more = findProfileLinks(p.links, at, {
          frames: p.frames, sameAs: sameAsUrls(p.jsonld), source: `${got.target.why} page`,
        })
        for (const k of Object.keys(more)) if (!profiles[k]) profiles[k] = more[k]
        if (got.target.kind === 'work') {
          workPage = { ok: true, url: at, page: p, res: got.res }
        }
      }
    } else {
      emit('wave', {
        wave: 2,
        doing: internals.length
          ? 'There was not enough clock left to open a second page of their site.'
          : 'The homepage points at no page of their own worth opening on its own.',
      })
    }

    site.status = 'read'
    site.findings = websiteFindings({ res, page, insecure, city, workPage })
  } else if (res.ok) {
    // It answered. We could not read what it said. Those are different facts
    // and the second one is not a verdict on their website.
    site.status = 'unreadable'
    site.note = gibberish
  } else {
    site.status = res.kind === 'blocked' ? 'refused' : 'unreachable'
    site.note = res.kind === 'timeout'
      ? `We gave the page ${Math.round((res.ms || 0) / 100) / 10} seconds and it did not ` +
        'finish answering, so we stopped. That is our clock, not a verdict on the site.'
      : `We could not reach it: ${res.error}. Nothing below is a finding about your ` +
        'website either way.'
  }

  settled(site)

  // ── AI answers: what their own robots file says, and what it does not ────
  // Settled here rather than at the end because we knew it in wave 1, and the
  // report draws the sequence it is given.
  const ai = surfaces.get('ai-answers')
  ai.status = robots && robots.ok ? 'read' : 'not_looked'
  ai.looked_at = normal.robots
  ai.findings = [
    aiCrawlerFinding(robots),
    finding({
      id: 'ai-answers.named', part_key: 'ai-answers', standing: 'unknown',
      looked_at: 'Nothing. This one needs a question asked of the assistants ' +
        'themselves, which is not a page anybody can open.',
      found: 'Whether an assistant names you when somebody asks for your trade in ' +
        'your city needs a real prompt run, which this scan does not do.',
      to_check_this: 'A prompt run against the assistants. It takes longer than ' +
        'this scan is allowed to take.',
    }),
  ]
  settled(ai)

  // ── wave 3: every profile the site points at, together ───────────────────
  const wanted = Object.keys(profiles).slice(0, MAX_PROFILE_FETCHES)
  emit('wave', {
    wave: 3,
    doing: wanted.length
      ? `Opening the ${wanted.length} profile${wanted.length === 1 ? '' : 's'} their site points at.`
      : 'Their site points at no profiles, so there is nothing in this wave to open.',
  })
  // THE WAVE IS PARALLEL; THE SETTLING IS NOT. These four requests all leave at
  // once, but they come back at different times, and each surface is finished
  // the moment its own answer arrives rather than when the slowest one does.
  // The difference matters for one reason: the report page draws the sequence,
  // and settling them together after Promise.all would stamp four surfaces with
  // one millisecond they did not share. Awaiting the whole wave before moving
  // on is unchanged — nothing downstream starts early.
  const PROFILE_KEYS = ['google-business-profile', 'yelp', 'company-linkedin', 'owners-linkedin']
  const jobs = []
  const fetching = new Set()

  if (readable && wanted.length && canFetch()) {
    for (const key of wanted) {
      if (!canFetch() || isSearchShaped(profiles[key].url)) continue
      fetches += 1
      fetching.add(key)
      jobs.push(
        fetchImpl(profiles[key].url, {
          timeoutMs: Math.min(SECONDARY_MS, budgetLeft()),
          maxBytes: SECONDARY_BYTES, deadline,
        })
          .then(note)
          .catch((e) => ({ ok: false, kind: 'blocked', error: String(e.message || e) }))
          .then((r) => {
            if (!PROFILE_KEYS.includes(key)) return
            const s = surfaces.get(key)
            s.looked_at = profiles[key].url
            s.status = 'read'
            s.findings = [profileFinding(key, profiles[key], r)]
            settled(s)
          })
      )
    }
  }

  for (const key of PROFILE_KEYS) {
    if (fetching.has(key)) continue
    const s = surfaces.get(key)
    if (!readable) {
      s.status = 'not_looked'
      s.note = 'This is found by reading your homepage, and we could not read your ' +
        'homepage. Nothing here was checked.'
    } else if (profiles[key]) {
      // Linked, but we did not open it — a search-shaped address, or the fetch
      // budget was already spent. profileFinding() says which.
      s.looked_at = profiles[key].url
      s.status = 'read'
      s.findings = [profileFinding(key, profiles[key], null)]
    } else {
      s.looked_at = res.finalUrl || res.url
      s.status = 'read'
      s.findings = [noLinkFinding(key, { pagesRead, hosts: outbound })]
    }
    settled(s)
  }

  await Promise.all(jobs)

  // ── Reviews ─────────────────────────────────────────────────────────────
  // A SECOND CLAIM THAT WAS NOT TRUE. This surface said, on every report, "your
  // Google listing … this scan did not open one" — including on the reports
  // where wave 3 had just opened it and got a 200. It was written when nothing
  // reached a listing and never revisited when something did. It now says which
  // of the two actually happened, and the reason the reviews still are not in
  // the answer is the honest one: Google draws them in the browser, so they are
  // not in the document a fetch returns.
  const reviews = surfaces.get('online-reviews')
  const rating = page ? findAggregateRating(page.jsonld) : null
  const gbp = surfaces.get('google-business-profile')
  const gbpOpened = (gbp.findings || []).some((f) => f.id.endsWith('.linked'))
  const gbpReceipt = ((gbp.findings || []).find((f) => f.receipt && f.receipt.url) || {}).receipt
  reviews.status = 'read'
  reviews.looked_at = readable ? (res.finalUrl || res.url) : null
  reviews.findings = []

  if (gbpOpened) {
    reviews.findings.push(finding({
      id: 'online-reviews.listing_opened', part_key: 'online-reviews', standing: 'unknown',
      // Clipped: a Maps place URL is 250 characters of coordinates and feature
      // ids, and printed whole it is the widest thing on the report.
      looked_at: `Your Google listing, at ${clip(gbpReceipt ? gbpReceipt.url
        : profiles['google-business-profile'].url, 110)}`,
      found: 'We opened your Google listing and it answered, but the reviews are ' +
        'not in what came back: Google draws the listing in the browser, so a ' +
        'fetch returns the page without its contents. How many reviews you have, ' +
        'how recent they are and whether any of them name commercial work is not ' +
        'checked here.',
      to_check_this: 'Reading the listing in a browser, which is a minute, or the ' +
        'Google Business Profile login, which is the real answer.',
    }))
  } else {
    reviews.findings.push(finding({
      id: 'online-reviews.not_checked', part_key: 'online-reviews', standing: 'unknown',
      looked_at: 'Nothing — reviews are read off the Google listing, and we did ' +
        'not find an address for one to open.',
      found: 'Reviews are counted and read on your Google listing, and this scan ' +
        'did not open one. How many you have, how recent they are and whether ' +
        'any of them name commercial work is not checked here.',
      to_check_this: 'The Maps link for your listing.',
    }))
  }

  // Where a buyer can go and read them, off their own site. A fact about their
  // pages, said as one — never a count of reviews, which we cannot see.
  const reviewPlaces = readable ? reviewLinks(profiles) : []
  if (reviewPlaces.length) {
    reviews.findings.push(finding({
      id: 'online-reviews.places', part_key: 'online-reviews', standing: 'good',
      looked_at: `Every link on ${pagesRead.join(' and ')}.`,
      found: `Your site sends a buyer to ${reviewPlaces.length} place` +
        `${reviewPlaces.length === 1 ? '' : 's'} where reviews of you are public: ` +
        `${reviewPlaces.map((p) => p.name).join(', ')}.`,
      // The receipt is the document that carries the links, because the claim is
      // about their site — not the platform, which we did not read.
      receipt: receiptFrom(res, reviewPlaces.map((p) => p.url).join(' · ')),
      not_verified: 'What those reviews say, and how many there are, is drawn in ' +
        'the browser on both platforms and is not in the page a fetch returns.',
    }))
  }

  if (rating) {
    reviews.findings.push(finding({
      id: 'online-reviews.self_reported', part_key: 'online-reviews', standing: 'unknown',
      looked_at: 'The structured data your own homepage publishes.',
      found: `Your homepage publishes a rating of ${rating.value != null ? rating.value : 'unstated'}` +
        `${rating.count != null ? ` from ${rating.count} reviews` : ''} in its own page data.`,
      to_check_this: 'What Google actually shows is read off the listing itself. ' +
        'This is what your site says about itself.',
    }))
  }
  settled(reviews)

  const list = [...surfaces.values()]
  const findings = list.flatMap((s) => s.findings)
  const rank = { weak: 0, unknown: 1, good: 2 }
  findings.sort((a, b) => rank[a.standing] - rank[b.standing])

  const elapsed = now() - startedAt
  return {
    ok: true,
    company: company || null,
    city: city || null,
    website: {
      requested: String(website),
      opened: normal.url,
      final: res.ok ? (res.finalUrl || res.url) : null,
    },
    scanned_at: new Date().toISOString(),
    elapsed_ms: elapsed,
    budget_ms: budgetMs,
    // TRUE when the clock, not the sites, ended something. The report has to be
    // able to say "we stopped early" rather than present a short list as a
    // complete one.
    timed_out: clockRanOut || elapsed >= budgetMs,
    fetches,
    surfaces: list,
    findings,
    summary: {
      surfaces_read: list.filter((s) => s.status === 'read').length,
      surfaces_not_looked: list.filter((s) => s.status !== 'read').length,
      weak: findings.filter((f) => f.standing === 'weak').length,
      good: findings.filter((f) => f.standing === 'good').length,
      unknown: findings.filter((f) => f.standing === 'unknown').length,
      verified: findings.filter((f) => f.confidence === 'verified').length,
    },
  }
}

// ── THE ROUTE ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      error: 'This endpoint takes a POST: { company, website, city? }',
    })
  }

  let who
  try {
    who = await verifyTenant(TENANT, req)
  } catch (e) {
    if (e instanceof TenantAuthError) {
      return res.status(e.status || 403).json({ error: String(e.message), auth: false })
    }
    return res.status(500).json({ error: String(e.message || e) })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}') } catch { body = {} }
  }
  body = body || {}

  const company = String(body.company == null ? '' : body.company).trim()
  const city = String(body.city == null ? '' : body.city).trim()
  if (!company) {
    return res.status(400).json({
      error: 'company is required: the name of the company, as they write it.',
    })
  }
  if (company.length > MAX_COMPANY) {
    return res.status(400).json({ error: `company must be ${MAX_COMPANY} characters or fewer.` })
  }
  if (city.length > MAX_CITY) {
    return res.status(400).json({ error: `city must be ${MAX_CITY} characters or fewer.` })
  }

  const normal = normaliseWebsite(body.website)
  if (normal.error) return res.status(400).json({ error: normal.error })
  try {
    assertPublicUrl(normal.url)
  } catch (e) {
    return res.status(400).json({ error: String(e.message) })
  }

  const budget = Number(body.budget_ms)
  const budgetMs = Number.isFinite(budget)
    ? Math.max(2000, Math.min(TOTAL_BUDGET_MS, budget))
    : TOTAL_BUDGET_MS

  // ── STREAMING, BECAUSE THE WATCHING IS THE PRODUCT ───────────────────────
  // `{ stream: true }` returns the same scan as newline-delimited JSON, one
  // object per line, written as each surface actually settles. The last line is
  // the whole result — identical to what the plain POST returns — so a caller
  // that only wants the answer can ignore every earlier line and lose nothing.
  //
  // Why this exists rather than a delay on the client: the report page shows
  // seven surfaces resolving one after another, and a staggered reveal of data
  // that all arrived at once is a lie about the one thing this product sells.
  // Every event carries `at_ms`, measured inside scan() before it left the
  // server, so what the page draws is when it happened. If a proxy buffers the
  // stream and it all lands together, the page draws it together — that is the
  // honest degradation, and it costs the animation, not the report.
  //
  // Everything that can refuse the request has already refused it by this
  // point, because after the first byte the status code is spent: auth, the
  // company name, the address and its SSRF check are all above. A failure from
  // here on rides in the stream as an `error` line.
  if (body.stream === true || body.stream === 'true') {
    res.status(200)
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('X-Accel-Buffering', 'no')
    if (typeof res.flushHeaders === 'function') res.flushHeaders()
    const line = (o) => {
      try {
        res.write(JSON.stringify(o) + '\n')
        if (typeof res.flush === 'function') res.flush()
      } catch { /* client hung up; the scan finishes and is discarded */ }
    }
    try {
      const out = await scan({
        company, website: body.website, city: city || null, budgetMs,
        onProgress: line,
      })
      line({ event: 'done', at_ms: out.elapsed_ms, ...out, scanned_by: who.userName || null })
    } catch (e) {
      line({ event: 'error', error: String(e.message || e), blocked: !!(e instanceof BlockedTarget || e.blocked) })
    }
    return res.end()
  }

  try {
    const out = await scan({ company, website: body.website, city: city || null, budgetMs })
    return res.status(200).json({ ...out, scanned_by: who.userName || null })
  } catch (e) {
    if (e instanceof BlockedTarget || e.blocked) {
      return res.status(400).json({ error: String(e.message) })
    }
    return res.status(500).json({ error: String(e.message || e) })
  }
}
