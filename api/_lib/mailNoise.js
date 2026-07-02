// api/_lib/mailNoise.js — is this email real-person mail or machinery?
//
// JS port of the noise gate in scripts/support-triage.py (is_noise, M17/M19):
// sender-pattern check + bulk-content phrases + cold-outreach phrasing + the
// structural newsletter detector. The Python gate protects wish CREATION on the
// watcher; this port protects DISPLAY (support inbox/wish lists on Vercel) so
// blasts that predate the gate — or slip it — never render as real asks.
// Keep the two in sync when adding patterns; the Python file is the origin.

const NOISE_SENDER = new RegExp(
  '(no[-_.]?reply|do[-_.]?not[-_.]?reply|notifications?@|mailer|postmaster|bounce|' +
  '@docusign|calendar-notification|automated|offers@|deals@|@.*\\.beehiiv|@mail\\.|' +
  'campaign|eventbrite|@e-offers\\.|newsletter|marketing@|' +
  '@(?:e|em|e?mail|news|digest|info|hello|update[s]?|promo(?:tions)?|market(?:ing)?[-a-z0-9]*|' +
  'creators?|community|go|try|get|engage|connect|reply|send|broadcast|mta|mailer[0-9]*)' +
  '\\.[a-z0-9.-]+\\.[a-z]{2,}|' +
  '@insideapple\\.|@.*\\.shein\\.|@(?:[a-z0-9.-]+\\.)?nextdoor\\.|security@|alerts?@|digest@|hi@|' +
  'update[s]?@|\\breply@|team@.*\\.(io|app)\\b|' +
  'sales@|growth@|outreach@|partnerships?@|editorialstaff@|@luma-mail\\.|@lu\\.ma|@meetup\\.)',
  'i'
);

const BULK_CONTENT = new RegExp(
  "(unsubscribe|view (?:this email )?in (?:your )?browser|manage (?:your )?(?:email )?preferences|" +
  "email preferences|opt[- ]?out|you(?:'re| are) receiving this (?:email|message)|" +
  "no longer wish to receive|update your preferences|stop receiving|" +
  "this is a marketing (?:email|message)|sent to you because|privacy policy and terms|" +
  "%\\s?off\\b|shop now|flash sale|limited[- ]time offer|browse our inventory|" +
  "tech briefing|news briefing|daily briefing|morning briefing|evening briefing|" +
  "download (?:our |the )?app|download flipboard|in this edition|today'?s top stories?|" +
  "the most important .{0,40} of the day|chosen by .{0,30} editors?|read in (?:your )?browser|" +
  "save up to \\d+%|store wide|sound packs?|bundle includes|click the .{0,30} button|" +
  "registration (?:approved|pending approval) for|is starting in \\d+ (?:hour|minute)|" +
  "add to (?:your )?calendar|rsvp now|" +
  // Hype-blast phrasing (OddsJam-style promos that ride personal-looking senders,
  // caught live 2026-07-01): profit-porn language no real correspondent uses.
  "insane (?:profits?|results|returns)|massive monthly profits?|" +
  "most profitable (?:month|week|year)|users have achieved|" +
  "make (?:thousands|hundreds) of dollars)",
  'i'
);

const PITCH_CONTENT = new RegExp(
  "(book a (?:quick |short )?(?:call|demo|meeting)|schedule a (?:call|demo|meeting)|" +
  "(?:15|20|30)[- ]minute (?:call|chat)|quick call (?:this|next) week|" +
  "i came across your (?:website|company|profile|work)|are you the right person|" +
  "who(?:'s| is) the (?:right|best) person|we help (?:companies|businesses|brands|teams|agencies)|" +
  "following up on my (?:last|previous|earlier) email|just bumping this|circling back|" +
  "increase your (?:revenue|sales|leads|traffic|conversions)|grow your (?:business|brand|audience)|" +
  "free (?:audit|trial|consultation)|case stud(?:y|ies) (?:show|of how)|" +
  "our (?:clients|customers) (?:see|saw|get)|let me know if (?:this|you're) interested|" +
  "worth a (?:quick )?(?:chat|conversation)|guaranteed (?:results|leads|ranking)|" +
  "should i close (?:this|it) out|won'?t (?:follow up|keep bugging|bother you)|" +
  "if (?:it'?s |this is )?not a priority|takes (?:just )?(?:\\d+|a few) minutes|" +
  "open to (?:a (?:quick )?(?:chat|call)|exploring|learning more))",
  'gi'
);

const BULK_TELL = new RegExp(
  '\\b(unsubscribe|view (this|it) in (your )?browser|manage (your )?preferences|' +
  'email preferences|list[- ]unsubscribe|opt[- ]?out|you (are )?receiv(e|ing) this)\\b',
  'i'
);

function looksLikeNewsletter(body) {
  if (!body || body.length < 200) return '';
  const urls = body.match(/https?:\/\/[^\s)]+/g) || [];
  const bulkTell = BULK_TELL.exec(body);
  if (urls.length >= 12) return `high URL density (${urls.length} links)`;
  if (urls.length >= 6 && bulkTell) return `bulk shape (${urls.length} links + ${bulkTell[1].trim().toLowerCase().slice(0, 20)})`;
  const truncations = (body.match(/…/g) || []).length + (body.match(/\s\.\.\.\s/g) || []).length;
  if (truncations >= 4) return `newsletter truncations (${truncations}x ...)`;
  if (urls.length >= 4) {
    const hosts = {};
    for (const u of urls) {
      try { const h = new URL(u).hostname; hosts[h] = (hosts[h] || 0) + 1; } catch (_) { /* skip */ }
    }
    const top = Math.max(0, ...Object.values(hosts));
    if (top >= 4) return `tracking-host pattern (${top} links, one host)`;
  }
  return '';
}

// Known business contacts — mirror of corner/state/support-allowlist.json,
// served from cm_state (kind='support_allowlist') because Vercel can't read the
// disk copy. Real client threads are link-heavy; the structural heuristics
// (bulk/pitch/newsletter-shape) must never fire on them (spacerising/sirotin/
// arsenal false-positives, 2026-06-14 — re-confirmed live 2026-07-01 when this
// port flagged Struck/Sirotin threads). Hard noise-sender check still wins.
// 60s module-level cache; fail-open to empty sets, never block on it.
let _allowCache = null;
let _allowAt = 0;
export async function getKnownSenders() {
  if (_allowCache && Date.now() - _allowAt < 60000) return _allowCache;
  const empty = { domains: new Set(), addresses: new Set() };
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return empty;
  try {
    const r = await fetch(
      `${url}/rest/v1/cm_state?kind=eq.support_allowlist&scope_id=eq.all&client_id=eq.aom&select=payload&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = r.ok ? await r.json() : [];
    const p = rows?.[0]?.payload || {};
    _allowCache = {
      domains: new Set((p.domains || []).map((d) => String(d).toLowerCase().trim())),
      addresses: new Set((p.addresses || []).map((a) => String(a).toLowerCase().trim())),
    };
    _allowAt = Date.now();
    return _allowCache;
  } catch {
    return empty;
  }
}

export function isKnownSender(email, allow) {
  const addr = String(email || '').toLowerCase().trim();
  if (!addr || !addr.includes('@') || !allow) return false;
  if (allow.addresses.has(addr)) return true;
  return allow.domains.has(addr.split('@', 2)[1]);
}

// A real reply drags quoted history and forwarded signatures along — links and
// bulk phrases in THAT text say nothing about the sender. Judge only their own
// words: cut at the first quote marker / forward header / reply attribution.
function ownWords(body) {
  const s = String(body || '');
  const cut = s.search(/^\s*>|^-{2,}\s*Forwarded message|^Begin forwarded message:|^On .{5,80} wrote:/m);
  return cut >= 0 ? s.slice(0, cut) : s;
}

// (noisy, reason) — mirror of support-triage.is_noise. Pass knownSender=true
// (via isKnownSender + getKnownSenders) to skip the structural heuristics.
export function isNoiseMail(email, subject = '', rawBody = '', { knownSender = false } = {}) {
  const addr = String(email || '').toLowerCase();
  if (NOISE_SENDER.test(addr)) return { noisy: true, reason: `noise sender (${addr})` };
  if (knownSender) return { noisy: false, reason: '' };
  const body = ownWords(rawBody);
  const blob = `${subject}\n${body}`;
  const bulk = blob.match(BULK_CONTENT);
  if (bulk) return { noisy: true, reason: `bulk-mail content (${bulk[0].slice(0, 30).trim().toLowerCase()})` };
  const pitch = new Set();
  let m;
  PITCH_CONTENT.lastIndex = 0;
  while ((m = PITCH_CONTENT.exec(blob)) !== null) pitch.add(m[0].toLowerCase().slice(0, 30).trim());
  if (pitch.size >= 2) return { noisy: true, reason: `cold-outreach phrasing (${[...pitch].slice(0, 2).join(', ')})` };
  const why = looksLikeNewsletter(body);
  if (why) return { noisy: true, reason: `newsletter shape: ${why}` };
  return { noisy: false, reason: '' };
}
