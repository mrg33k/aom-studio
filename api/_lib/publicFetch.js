// publicFetch — open a stranger's public web page, on a timebox, and nothing else.
//
// This is scripts/client-engine-check.py's `_assert_public` / `_CheckedRedirect`
// / `fetch` block, ported to Node so the prospect scanner and the nightly check
// hold the SAME line about where an unattended fetcher is allowed to look. The
// scanner needed its own EXECUTION model (synchronous, parallel, timeboxed —
// the Python one is a dispatched background task and cannot serve a live scan).
// It does not get its own, weaker, second opinion about SSRF.
//
// The Python rules, kept verbatim in spirit:
//   http and https only            — no file://, no ftp://, no data:
//   the host must resolve          — and every address it resolves to must be
//                                    public: never private, loopback,
//                                    link-local, multicast or reserved
//   every redirect hop re-checked  — not just the URL we typed
//
// THREE PLACES THIS IS STRICTER, all because this route takes its URL from a
// text box rather than from a field only an operator can write:
//
//   1. THE CHECK IS AT CONNECT TIME, NOT BEFORE IT. Python resolves the host,
//      approves the IP, and then hands the NAME back to urllib, which resolves
//      it a second time — so a DNS record with a one-second TTL can answer
//      "93.184.216.34" to the check and "169.254.169.254" to the fetch. That is
//      DNS rebinding and it is the standard way past a validate-then-fetch
//      guard. Here the guard IS the socket's resolver (`lookup` below): the
//      addresses we validated are the only addresses the socket is given, so
//      there is no second lookup to poison.
//   2. PORTS 80 AND 443 ONLY. A company's public website is on a default port.
//      An internal service that happens to sit on a public IP is on 8080, 9200,
//      6379. Blocking the rest costs a prospect nothing.
//   3. NO BARE IP ADDRESSES, and no `user:pass@` in the address. A construction
//      company's website is a name. An IP literal in this box is somebody
//      probing, and credentials in a URL we are about to fetch and quote back
//      would be credentials we then render on a page.
//
// Everything here returns a PLAIN SENTENCE for its refusal, because the sentence
// is shown to the operator. "Blocked" teaches nobody anything.

import http from 'node:http'
import https from 'node:https'
import dns from 'node:dns'
import zlib from 'node:zlib'

// Identifiable, and accepted. The nightly check sends a plain Chrome string; a
// scanner that opens a stranger's site should also say who it is and where to
// complain, so the token is appended rather than swapped in — a bare
// "AOM-ClientEngine/1.0" is refused by most managed WAFs, and a scan that
// cannot read a Cloudflare-fronted site reports "could not reach" for half the
// trades in Phoenix.
export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36 ' +
  'AOM-ClientEngine/1.0 (+https://www.aheadofmarket.com/client-engine/)'

export class BlockedTarget extends Error {
  constructor(message) {
    super(message)
    this.name = 'BlockedTarget'
    this.blocked = true
  }
}

// ── IS THIS ADDRESS ON THE PUBLIC INTERNET? ────────────────────────────────
// Returns a plain-words problem, or null when the address is fine.

function ipv4Problem(ip) {
  const p = String(ip).split('.')
  if (p.length !== 4) return 'not a usable address'
  const n = p.map((x) => (/^\d{1,3}$/.test(x) ? Number(x) : NaN))
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return 'not a usable address'
  const [a, b] = n
  if (a === 0) return 'in the unspecified range'
  if (a === 10) return 'on a private network'
  if (a === 127) return 'the loopback range, which is this machine'
  if (a === 169 && b === 254) return 'in the link-local range, where cloud metadata lives'
  if (a === 172 && b >= 16 && b <= 31) return 'on a private network'
  if (a === 192 && b === 168) return 'on a private network'
  if (a === 100 && b >= 64 && b <= 127) return 'inside carrier-grade NAT'
  if (a === 192 && b === 0 && n[2] === 0) return 'in a reserved protocol range'
  if (a === 198 && (b === 18 || b === 19)) return 'in a benchmarking range'
  if (a >= 224) return 'in a multicast or reserved range'
  return null
}

// Full 8 groups, or null when the text is not an IPv6 address. Handles the
// v4-embedded tail (::ffff:10.0.0.1) by folding it into two groups first —
// which is the form that walks past a naive "does it start with fc" check.
function expandIpv6(raw) {
  let s = String(raw).toLowerCase().split('%')[0]
  const v4 = s.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (v4) {
    const q = v4[1].split('.').map(Number)
    if (q.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null
    s = s.slice(0, v4.index) +
      ((q[0] * 256 + q[1]).toString(16)) + ':' + ((q[2] * 256 + q[3]).toString(16))
  }
  const halves = s.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  let groups
  if (halves.length === 2) {
    const fill = 8 - head.length - tail.length
    if (fill < 0) return null
    groups = [...head, ...new Array(fill).fill('0'), ...tail]
  } else {
    groups = head
  }
  if (groups.length !== 8) return null
  const out = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN))
  if (out.some((x) => !Number.isInteger(x))) return null
  return out
}

function v4From(hi, lo) {
  return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`
}

function ipv6Problem(ip) {
  const g = expandIpv6(ip)
  if (!g) return 'not a usable address'
  if (g.every((x) => x === 0)) return 'the unspecified address'
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) {
    return 'the loopback address, which is this machine'
  }
  // ::ffff:a.b.c.d — an IPv4 address wearing an IPv6 coat
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
    return ipv4Problem(v4From(g[6], g[7])) || null
  }
  if ((g[0] & 0xfe00) === 0xfc00) return 'on a unique-local (private) network'
  if ((g[0] & 0xffc0) === 0xfe80) return 'in the link-local range'
  if ((g[0] & 0xff00) === 0xff00) return 'in a multicast range'
  if (g[0] === 0x0064 && g[1] === 0xff9b) return ipv4Problem(v4From(g[6], g[7])) || null   // NAT64
  if (g[0] === 0x2002) return ipv4Problem(v4From(g[1], g[2])) || null                       // 6to4
  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return 'in the discard range'
  return null
}

export function ipProblem(ip) {
  return String(ip).includes(':') ? ipv6Problem(ip) : ipv4Problem(ip)
}

// ── IS THIS A WEB ADDRESS WE WILL OPEN? ────────────────────────────────────
// Shape only — the host is checked again, for real, at connect time. Both
// halves are needed: this one gives a readable refusal before we spend a
// socket, and the connect-time one is the part that cannot be lied to.
export function urlProblem(raw) {
  let u
  try {
    u = new URL(String(raw))
  } catch {
    return 'that is not a web address'
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return `only http and https addresses are opened, not ${u.protocol.replace(':', '')}`
  }
  if (u.username || u.password) {
    return 'an address carrying a username or password is not opened'
  }
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (!host) return 'that address names no host'
  if (u.port && u.port !== '80' && u.port !== '443') {
    return `only ports 80 and 443 are opened, not ${u.port}`
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    const bad = ipProblem(host)
    if (bad) return `${host} is ${bad}`
    return 'a bare IP address is not a company website — give the domain name'
  }
  if (!/^(?=.{1,253}\.?$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}\.?$/i.test(host)) {
    return `"${host}" is not a public domain name`
  }
  return null
}

export function assertPublicUrl(raw) {
  const problem = urlProblem(raw)
  if (problem) throw new BlockedTarget(problem)
  return String(raw)
}

// ── THE RESOLVER THE SOCKET USES ───────────────────────────────────────────
// net.connect calls this instead of dns.lookup. Every address the name answers
// with is checked, and the checked list is what the socket connects to — so a
// name that resolves to one public address and one loopback address is refused
// outright rather than being a coin flip, and there is no second resolution for
// a short TTL to poison.
export function guardedLookup(hostname, options, callback) {
  const cb = typeof options === 'function' ? options : callback
  const opts = typeof options === 'function' ? {} : (options || {})
  dns.lookup(hostname, { ...opts, all: true, verbatim: true }, (err, addresses) => {
    if (err) return cb(err)
    const list = Array.isArray(addresses) ? addresses : [addresses]
    if (!list.length) return cb(new BlockedTarget(`${hostname} does not resolve`))
    for (const a of list) {
      const bad = ipProblem(a.address)
      if (bad) return cb(new BlockedTarget(`${hostname} resolves to ${a.address}, which is ${bad}`))
    }
    if (opts.all) return cb(null, list)
    return cb(null, list[0].address, list[0].family)
  })
}

// ── ONE REQUEST, ONE HOP, ONE HARD CEILING ─────────────────────────────────
// Never follows a redirect: the caller does that, so every hop goes back
// through assertPublicUrl. Resolves — it does not reject — for anything that is
// the site's fault (timeout, refused, TLS), because "we could not reach this"
// is a result the report has to be able to print, not an exception that ends a
// scan. It rejects only for a BLOCKED target, which is our refusal and not
// theirs.
// COMPRESSION IS NOT OPTIONAL TO GET RIGHT.
//
// Node's http module sends no Accept-Encoding and does not decompress. Plenty
// of servers gzip anyway — iconmechanicalinc.com, a real Phoenix HVAC
// contractor, answers `content-encoding: gzip` to a request that never asked
// for it. Reading those bytes as HTML finds no title, no phone number, no
// images and no viewport tag, and the scan then tells a stranger seven things
// about his website that are all false. That happened, on the first pass over
// a real prospect list, and it is the exact failure this product exists to make
// impossible.
//
// So: ask for compression, and decompress properly. The cap is applied on BOTH
// sides of the decompressor — a gzip bomb is a kilobyte on the wire and a
// gigabyte in memory, and a guard that only counts wire bytes is no guard.
function decompressorFor(encoding) {
  switch (String(encoding || '').toLowerCase().trim()) {
    case '':
    case 'identity':
      return { stream: null, known: true }
    case 'gzip':
    case 'x-gzip':
      return { stream: zlib.createGunzip(), known: true }
    case 'deflate':
      return { stream: zlib.createInflate(), known: true }
    case 'br':
      return { stream: zlib.createBrotliDecompress(), known: true }
    default:
      return { stream: null, known: false }
  }
}

export function fetchOnce(url, { timeoutMs = 4000, maxBytes = 400000 } = {}) {
  assertPublicUrl(url)
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const mod = u.protocol === 'https:' ? https : http
    const started = Date.now()
    let done = false
    let timer = null
    let req = null

    const settle = (value) => {
      if (done) return
      done = true
      if (timer) clearTimeout(timer)
      try { if (req) req.destroy() } catch { /* already gone */ }
      resolve(value)
    }
    const fail = (why, kind) => settle({
      ok: false, url, kind, error: why, ms: Date.now() - started,
    })

    timer = setTimeout(() => fail(`took longer than ${timeoutMs}ms to answer`, 'timeout'),
      Math.max(1, timeoutMs))

    try {
      req = mod.request(u, {
        method: 'GET',
        lookup: guardedLookup,
        // Node's own socket timeout as well as the wall clock above: the wall
        // clock is the promise the scan makes, this one frees the socket.
        timeout: Math.max(1, timeoutMs),
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'close',
        },
      }, (res) => {
        const encoding = String(res.headers['content-encoding'] || '')
        const { stream: decomp, known } = decompressorFor(encoding)
        const source = decomp ? res.pipe(decomp) : res

        const chunks = []
        let wire = 0
        let n = 0
        let overflowed = false

        // The wire side, so a bomb never gets fed to the decompressor.
        res.on('data', (c) => {
          wire += c.length
          if (wire > maxBytes * 4) { overflowed = true; res.destroy() }
        })
        // The decompressed side, which is what we actually keep.
        source.on('data', (c) => {
          n += c.length
          if (n <= maxBytes) chunks.push(c)
          else { overflowed = true; res.destroy(); source.destroy() }
        })

        const finish = () => settle({
          ok: true,
          url,
          status: res.statusCode,
          headers: res.headers,
          location: res.headers.location || null,
          contentType: String(res.headers['content-type'] || ''),
          contentEncoding: encoding || null,
          // An encoding we do not know how to undo means the bytes below are
          // NOT the page. Said out loud so a caller cannot read them by
          // accident; the scanner refuses to make a finding out of them.
          undecodable: !known,
          body: known ? Buffer.concat(chunks).toString('utf8') : '',
          bytes: n,
          wireBytes: wire,
          truncated: overflowed,
          ms: Date.now() - started,
        })
        source.on('end', finish)
        source.on('close', finish)
        source.on('error', () => fail(
          `answered in ${encoding || 'an encoding'} that did not decode`, 'error'))
        if (decomp) res.on('error', () => fail('the connection dropped mid-page', 'error'))
      })
    } catch (e) {
      if (e instanceof BlockedTarget) return reject(e)
      return fail(String(e.message || e), 'error')
    }

    req.on('timeout', () => fail(`took longer than ${timeoutMs}ms to answer`, 'timeout'))
    req.on('error', (e) => {
      // The guarded resolver's refusal arrives here, as the socket's error.
      if (e instanceof BlockedTarget || e.blocked) {
        if (done) return
        done = true
        if (timer) clearTimeout(timer)
        return reject(e)
      }
      fail(String(e.message || e), 'error')
    })
    req.end()
  })
}

// ── FOLLOW REDIRECTS, CHECKING EVERY HOP ───────────────────────────────────
// The whole chain shares ONE budget. A site that 301s five times and then
// stalls must not cost five timeouts.
export async function fetchPublic(url, {
  timeoutMs = 4500, maxBytes = 400000, maxHops = 5, deadline = null,
} = {}) {
  const started = Date.now()
  const hops = []
  let current = assertPublicUrl(url)

  for (let i = 0; i <= maxHops; i++) {
    const spent = Date.now() - started
    let left = timeoutMs - spent
    if (deadline) left = Math.min(left, deadline - Date.now())
    if (left < 250) {
      return {
        ok: false, kind: 'timeout', url: current, hops,
        error: 'ran out of time before the page answered',
        ms: Date.now() - started,
      }
    }

    const res = await fetchOnce(current, { timeoutMs: left, maxBytes })
    hops.push({ url: current, status: res.ok ? res.status : null })
    if (!res.ok) return { ...res, url: current, hops, ms: Date.now() - started }

    const redirect = res.status >= 300 && res.status < 400 && res.location
    if (!redirect) {
      return { ...res, finalUrl: current, hops, redirected: hops.length > 1,
        ms: Date.now() - started }
    }
    if (i === maxHops) {
      return {
        ok: false, kind: 'error', url: current, hops,
        error: `redirected more than ${maxHops} times`, ms: Date.now() - started,
      }
    }
    let next
    try {
      next = new URL(res.location, current).toString()
    } catch {
      return { ok: false, kind: 'error', url: current, hops,
        error: 'redirected to something that is not a web address',
        ms: Date.now() - started }
    }
    // The hop we were SENT to gets the same check as the one we typed. This is
    // the line a public URL that 302s to 169.254.169.254 dies on.
    const problem = urlProblem(next)
    if (problem) {
      return { ok: false, kind: 'blocked', url: current, hops,
        error: `it redirected to an address we do not open: ${problem}`,
        ms: Date.now() - started }
    }
    current = next
  }
  /* c8 ignore next */
  return { ok: false, kind: 'error', url: current, hops, error: 'redirect loop',
    ms: Date.now() - started }
}
