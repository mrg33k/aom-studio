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
const MAX_FETCHES = 9
const MAX_PROFILE_FETCHES = 5
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
const SECONDARY_BYTES = 80000

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

  const links = []
  const linkRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  let m
  while ((m = linkRe.exec(src)) !== null) {
    const attrs = m[1]
    const hrefM = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
    if (!hrefM) continue
    const href = (hrefM[1] || hrefM[2] || hrefM[3] || '').trim()
    if (!href) continue
    const label = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    links.push({ href, label })
    if (links.length >= 600) break
  }

  const jsonld = []
  const ldRe = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  while ((m = ldRe.exec(src)) !== null) {
    try { jsonld.push(JSON.parse(m[1].trim())) } catch { /* malformed, ignore */ }
  }

  return {
    title,
    viewport: viewportM ? viewportM[0].replace(/\s+/g, ' ').trim() : null,
    links,
    text,
    jsonld,
    images: (src.match(/<img\b/gi) || []).length,
    forms: (src.match(/<form\b/gi) || []).length,
    inputs: (src.match(/<input\b|<textarea\b/gi) || []).length,
  }
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
    /(^|\.)goo\.gl$/i.test(u.hostname) && /^\/maps\b/i.test(u.pathname)],
  ['yelp', (u) => /(^|\.)yelp\.[a-z.]+$/i.test(u.hostname) && /^\/biz\//i.test(u.pathname)],
  ['company-linkedin', (u) =>
    /(^|\.)linkedin\.com$/i.test(u.hostname) && /^\/(company|school)\//i.test(u.pathname)],
  ['owners-linkedin', (u) =>
    /(^|\.)linkedin\.com$/i.test(u.hostname) && /^\/in\//i.test(u.pathname)],
]

export function findProfileLinks(links, base) {
  const out = {}
  for (const { href } of links) {
    let u
    try { u = new URL(href, base) } catch { continue }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
    for (const [key, match] of PROFILE_PATTERNS) {
      if (out[key]) continue
      let hit = false
      try { hit = match(u) } catch { hit = false }
      if (hit) out[key] = u.toString()
    }
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

const CONTACT_WORDS = /(contact|get a quote|request a quote|free quote|get an estimate|request an estimate|book|schedule|get started|talk to us|request service)/i
const WORK_WORDS = /(project|portfolio|our work|case stud|gallery|past work|recent work)/i
const TEL_RE = /\btel:\s*([+0-9().\s-]{7,})/i
const PHONE_TEXT_RE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/

function clip(s, n = 160) {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

// ── A FINDING ──────────────────────────────────────────────────────────────
// The receipt rule, in code. A finding that judges the business — good or weak
// — must name the document it read. Without one it is an opinion with a
// confident font, which is the exact thing this product exists not to ship.
export function finding({
  id, part_key, looked_at, found, costs = null, standing,
  receipt = null, not_verified = null, to_check_this = null,
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

function websiteFindings({ res, page, insecure, city }) {
  const out = []
  const url = res.finalUrl || res.url
  const opened = 'Your homepage, opened the way a visitor\'s browser opens it.'
  const receipt = (quote) => receiptFrom(res, quote)

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

  // A "we did not find it" finding, told honestly whichever way the read went.
  const absent = ({ id, found, costs, cutTo, how = '' }) => (cut
    ? finding({
      id, part_key: 'website', standing: 'unknown',
      looked_at: `${opened}${how} The page is longer than we read, so we looked at ${readSoFar}.`,
      found: `${found} The page continues past where we stopped, so this is not a ` +
        'statement about the whole of it.',
      to_check_this: cutTo,
    })
    : finding({ id, part_key: 'website', standing: 'weak', looked_at: `${opened}${how}`,
      found, costs, receipt: receipt(null) }))

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
  const phoneInText = page.text.match(PHONE_TEXT_RE)
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
        found: `A phone number appears as text (${phoneInText[0]}) and is not a ` +
          'link in the part of the page we read. The page continues past that ' +
          'point, so we cannot say there is no tappable number further down.',
        to_check_this: 'Tapping the number on your own homepage from a phone.',
      })
      : finding({
        id: 'website.phone', part_key: 'website', looked_at: opened, standing: 'weak',
        found: `A phone number appears on the page as text (${phoneInText[0]}) but ` +
          'is not a link, so tapping it on a phone does nothing.',
        costs: 'On a phone the number has to be read, remembered and typed before ' +
          'it can be dialled. That is the step where a caller tries the next ' +
          'company on the list instead.',
        receipt: receipt(phoneInText[0]),
      }))
  } else {
    out.push(absent({
      id: 'website.phone',
      found: 'No phone number was found on the homepage — no tel: link, and no ' +
        'number in the page text.',
      costs: 'The buyer who has already decided to call you has nowhere to call ' +
        'from without hunting for it.',
      cutTo: 'Looking at the rest of your own homepage settles it.',
    }))
  }

  // 5. a next action
  const contactLink = page.links.find((l) => CONTACT_WORDS.test(l.label) || CONTACT_WORDS.test(l.href))
  const hasForm = page.forms > 0 && page.inputs > 0
  if (contactLink || hasForm) {
    out.push(finding({
      id: 'website.next_action', part_key: 'website', looked_at: opened, standing: 'good',
      found: contactLink
        ? `The homepage offers a way to start: "${clip(contactLink.label || contactLink.href, 60)}".`
        : `The homepage carries a form with ${page.inputs} fields.`,
      receipt: receipt(contactLink ? contactLink.href : `${page.forms} form(s), ${page.inputs} fields`),
    }))
  } else {
    out.push(absent({
      id: 'website.next_action',
      found: 'The homepage has no form and no link whose text or address offers ' +
        'contact, a quote or an estimate.',
      costs: 'A general contractor building a bid list has no way to start a ' +
        'conversation without leaving the page. He does not leave the page. He ' +
        'closes the tab.',
      cutTo: 'Whether there is a contact link below where we stopped.',
    }))
  }

  // 6. proof of work
  const workLink = page.links.find((l) => WORK_WORDS.test(l.label) || WORK_WORDS.test(l.href))
  if (workLink) {
    out.push(finding({
      id: 'website.proof_of_work', part_key: 'website', looked_at: opened, standing: 'good',
      found: `The homepage links to work: "${clip(workLink.label || workLink.href, 60)}".`,
      receipt: receipt(workLink.href),
      not_verified: 'We did not open it, so what is behind that link — how many ' +
        'projects, at what size, how recent — is not checked here.',
    }))
  } else {
    out.push(absent({
      id: 'website.proof_of_work',
      found: 'Nothing on the homepage links to projects, a portfolio, a gallery ' +
        `or case studies. The page carries ${page.images} images.`,
      costs: 'The only question a buyer has is whether you have done his job at ' +
        'his size before. This page asks him to take that on faith.',
      cutTo: 'Whether there is a projects link below where we stopped.',
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
function marketFinding({ page, receipt, term, id, opened, weakCost, absent }) {
  const i = page.text.toLowerCase().indexOf(String(term).toLowerCase())
  if (i >= 0) {
    const around = page.text.slice(Math.max(0, i - 60), i + String(term).length + 60)
    return finding({
      id, part_key: 'website', standing: 'good',
      looked_at: `${opened} We searched the page text for the word "${term}".`,
      found: `"${term}" appears on the homepage: "…${clip(around, 140)}…"`,
      receipt: receipt(around),
    })
  }
  return absent({
    id,
    how: ` We searched the page text for the word "${term}".`,
    found: `The word "${term}" does not appear anywhere in the homepage text.`,
    costs: weakCost,
    cutTo: `Whether "${term}" appears below where we stopped reading.`,
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
    found: 'We found no link to a Google listing anywhere on your homepage. That ' +
      'is not proof you do not have one — it is proof a buyer on your site ' +
      'cannot reach it in one tap. We do not count a Google search result as a ' +
      'listing, so we are not going to show you one and call it yours.',
    ask: 'The Maps link for your listing, copied from the address bar. That is ' +
      'the one thing this scan cannot get on its own.',
  },
  yelp: {
    found: 'We found no link to a Yelp page on your homepage. Whether one exists ' +
      'is not something this scan checked.',
    ask: 'The address of your Yelp page, if you have one.',
  },
  'company-linkedin': {
    found: 'We found no link to a company LinkedIn page on your homepage.',
    ask: 'The address of your company page on LinkedIn.',
  },
  'owners-linkedin': {
    found: "We found no link to an owner's LinkedIn profile on your homepage.",
    ask: "The owner's LinkedIn profile address.",
  },
}

function profileFinding(partKey, url, res) {
  const looked = `The address your homepage publishes for this: ${url}`
  if (isSearchShaped(url)) {
    return finding({
      id: `${partKey}.search_link`, part_key: partKey, standing: 'unknown',
      looked_at: looked,
      found: 'The link on your homepage is a SEARCH, not a page. It runs a query ' +
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
  return finding({
    id: `${partKey}.linked`, part_key: partKey, standing: 'good',
    looked_at: looked,
    found: `Your homepage links to it, and it answered HTTP ${res.status} when we opened it.`,
    receipt: receiptFrom(res),
    not_verified: CANNOT_READ[partKey] || null,
  })
}

function noLinkFinding(partKey) {
  const copy = NO_LINK[partKey]
  return finding({
    id: `${partKey}.not_linked`, part_key: partKey, standing: 'unknown',
    looked_at: 'Every link on your homepage.',
    found: copy.found,
    to_check_this: copy.ask,
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
  return { url: secure.toString(), insecureProbe: insecure.toString() }
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
} = {}) {
  const startedAt = now()
  const deadline = startedAt + budgetMs
  const normal = normaliseWebsite(website)
  if (normal.error) throw new BlockedTarget(normal.error)

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

  // ── wave 1: the homepage, and the plain-http probe, together ─────────────
  fetches += 2
  const [home, insecure] = await Promise.all([
    fetchImpl(normal.url, {
      timeoutMs: Math.min(HOMEPAGE_MS, budgetLeft()), maxBytes: HOMEPAGE_BYTES, deadline,
    }).then(note).catch((e) => ({ ok: false, kind: 'blocked', url: normal.url, error: String(e.message || e) })),
    fetchOnceImpl(normal.insecureProbe, {
      timeoutMs: Math.min(2500, budgetLeft()), maxBytes: 4000,
    }).then(note).catch((e) => ({ ok: false, kind: 'blocked', error: String(e.message || e) })),
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
  const gibberish = res.ok ? unreadableBody(res) : null
  const readable = res.ok && !gibberish
  if (readable) {
    site.status = 'read'
    page = readHtml(res.body)
    site.findings = websiteFindings({ res, page, insecure, city })
    profiles = findProfileLinks(page.links, res.finalUrl || res.url)
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

  // ── wave 2: every profile the homepage points at, together ───────────────
  const wanted = Object.keys(profiles).slice(0, MAX_PROFILE_FETCHES)
  const fetched = {}
  if (wanted.length && canFetch()) {
    const jobs = wanted.map(async (key) => {
      if (!canFetch() || isSearchShaped(profiles[key])) return [key, null]
      fetches += 1
      const r = await fetchImpl(profiles[key], {
        timeoutMs: Math.min(SECONDARY_MS, budgetLeft()),
        maxBytes: SECONDARY_BYTES, deadline,
      }).then(note).catch((e) => ({ ok: false, kind: 'blocked', error: String(e.message || e) }))
      return [key, r]
    })
    for (const [key, r] of await Promise.all(jobs)) fetched[key] = r
  }

  for (const key of ['google-business-profile', 'yelp', 'company-linkedin', 'owners-linkedin']) {
    const s = surfaces.get(key)
    if (!readable) {
      s.status = 'not_looked'
      s.note = 'This is found by reading your homepage, and we could not read your ' +
        'homepage. Nothing here was checked.'
      continue
    }
    if (profiles[key]) {
      s.looked_at = profiles[key]
      s.status = 'read'
      s.findings = [profileFinding(key, profiles[key], fetched[key])]
    } else {
      s.looked_at = res.finalUrl || res.url
      s.status = 'read'
      s.findings = [noLinkFinding(key)]
    }
  }

  // Reviews: the only honest reading of them from outside is the Google
  // listing, and we did not open one. What the site says about itself is a
  // different fact and is labelled as one.
  const reviews = surfaces.get('online-reviews')
  const rating = page ? findAggregateRating(page.jsonld) : null
  reviews.status = 'read'
  reviews.looked_at = readable ? (res.finalUrl || res.url) : null
  if (rating) {
    reviews.findings = [finding({
      id: 'online-reviews.self_reported', part_key: 'online-reviews', standing: 'unknown',
      looked_at: 'The structured data your own homepage publishes.',
      found: `Your homepage publishes a rating of ${rating.value != null ? rating.value : 'unstated'}` +
        `${rating.count != null ? ` from ${rating.count} reviews` : ''} in its own page data.`,
      to_check_this: 'What Google actually shows is read off the listing, and we ' +
        'did not open one. This is what your site says about itself.',
    })]
  } else {
    reviews.findings = [finding({
      id: 'online-reviews.not_checked', part_key: 'online-reviews', standing: 'unknown',
      looked_at: 'Nothing — reviews are read off the Google listing.',
      found: 'Reviews are counted and read on your Google listing, and this scan ' +
        'did not open one. How many you have, how recent they are and whether ' +
        'any of them name commercial work is not checked here.',
      to_check_this: 'The Maps link for your listing.',
    })]
  }

  // AI answers: the checker's own words, because it is the same limitation.
  const ai = surfaces.get('ai-answers')
  ai.status = 'not_looked'
  ai.findings = [finding({
    id: 'ai-answers.not_checked', part_key: 'ai-answers', standing: 'unknown',
    looked_at: 'Nothing.',
    found: 'Whether an assistant names you when somebody asks for your trade in ' +
      'your city needs a real prompt run, which this scan does not do.',
    to_check_this: 'A prompt run against the assistants. It takes longer than ' +
      'this scan is allowed to take.',
  })]

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
