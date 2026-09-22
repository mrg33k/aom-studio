// Website performance numbers for the report pages (/analytics/<site>).
// Live reads from Google Analytics 4 (Data API + Admin API) with the AOM service account; nothing is stored here.
// Env: GA_SA_KEY_B64 (service-account JSON, base64) and ANALYTICS_KEY (the report key the page sends).

import crypto from 'node:crypto';

const SITES = {
  aom: { name: 'Ahead of Market', host: 'aheadofmarket.com', measurement: 'G-XRC3GJ475X', kind: 'v4',
    leads: [['generate_lead', 'lead_submit'], ['phone_click'], ['email_click']] },
  ambition: { name: 'Ambition Mechanical', host: 'ambitionac.com', measurement: 'G-JQ7KZRTWQM', property: '525952571',
    leads: [['generate_lead', 'form_submit'], ['phone_click'], ['email_click']] },
  wolfpack: { name: 'Wolfpack Companies', host: 'wolfpackcompanies.com', measurement: 'G-GTYRFZHJ4B',
    leads: [['generate_lead', 'form_submit'], ['phone_click'], ['email_click']] },
};

// v4 homepage sections, in page order (variant a). Keys match sectionKey() in public/home-v4/index.html.
const V4_SECTIONS = [
  ['hero', 'Hero: quiz + films'], ['help', 'How we can help'], ['two_parts', 'Two parts'], ['department', 'Your marketing department'],
  ['industry_tech', 'Technology'], ['industry_construction', 'Construction'], ['industry_nonprofit', 'Nonprofits'], ['industry_restaurants', 'Restaurants'],
  ['work', 'The work'], ['voices', 'Voices'], ['billboard', 'Billboard'], ['contact', 'Ready when you are'],
];
const FAMILIES = ['section_view', 'section_time', 'scroll_depth', 'quiz_answer', 'cta_click', 'video_open', 'video_from', 'video_watch', 'videos_watched', 'outcome_open', 'lead_submit', 'lead_error', 'form_start', 'card_swipe'];
const GA_INTERNAL = new Set(['page_view', 'session_start', 'first_visit', 'user_engagement', 'engagement_time', 'cookie_consent_updated', 'scroll', 'form_submit', 'form_step_complete', 'form_start', 'view_item', 'click', 'file_download', 'video_start', 'video_progress', 'video_complete']);
const LABELS = {
  phone_click: 'Tapped the phone number', email_click: 'Started an email', generate_lead: 'Sent a request', lead_submit: 'Sent a request',
  form_start: 'Started a form', quiz_answer: 'Answered the opening question', video_open: 'Opened a film', outcome_open: 'Opened a service card',
  card_swipe: 'Swiped through cards', button_click: 'Clicked a button or link', cta_click: 'Clicked a button or link', contact_drawer_open: 'Opened the contact panel',
  contact: 'Contact action', conversion: 'Conversion', roi_calculate: 'Ran the ROI calculator', roi_email_capture: 'Left an email on the ROI calculator', audit_booking_submit: 'Booked an audit',
};

// page furniture that says nothing about intent (cookie banner, carousels, menu toggles)
const CHROME = /^(\(not set\)|accept all|essential only|reject all|close|next image|previous image|next|previous|open navigation menu|close navigation menu|menu|x)$/i;

const cache = new Map();
let tokenCache = { token: '', exp: 0 };
const propCache = new Map();

function loadKey() {
  const b64 = process.env.GA_SA_KEY_B64;
  if (!b64) throw new Error('GA_SA_KEY_B64 is not set');
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
}

async function accessToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp - 60000) return tokenCache.token;
  const key = loadKey();
  const now = Math.floor(Date.now() / 1000);
  const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: key.token_uri, iat: now, exp: now + 3600 })}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), key.private_key).toString('base64url');
  const r = await fetch(key.token_uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }) });
  if (!r.ok) throw new Error('token ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

async function gget(url, token) {
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error(`${url} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Measurement id -> numeric property id, via the Admin API (only properties the service account can see).
async function resolveProperty(site, token) {
  if (site.property) return site.property;
  if (propCache.has(site.measurement)) return propCache.get(site.measurement);
  const sums = await gget('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', token);
  for (const a of sums.accountSummaries || []) for (const p of a.propertySummaries || []) {
    const streams = await gget(`https://analyticsadmin.googleapis.com/v1beta/${p.property}/dataStreams?pageSize=50`, token).catch(() => ({}));
    for (const st of streams.dataStreams || []) {
      const mid = st.webStreamData && st.webStreamData.measurementId;
      if (mid) propCache.set(mid, p.property.replace('properties/', ''));
    }
  }
  return propCache.get(site.measurement) || null;
}

async function runReport(property, token, body) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`runReport ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
async function runBatch(property, token, requests) {
  const out = [];
  for (let i = 0; i < requests.length; i += 5) {
    const chunk = requests.slice(i, i + 5);
    const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: chunk }) });
    if (!r.ok) throw new Error(`batchRunReports ${r.status} ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    out.push(...(j.reports || []));
  }
  return out;
}
const soft = p => p.catch(() => null);

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
function table(rep) {
  if (!rep || !rep.rows) return [];
  const dh = (rep.dimensionHeaders || []).map(h => h.name), mh = (rep.metricHeaders || []).map(h => h.name);
  return rep.rows.map(row => {
    const o = {};
    dh.forEach((n, i) => { o[n] = row.dimensionValues[i].value; });
    mh.forEach((n, i) => { o[n] = num(row.metricValues[i].value); });
    return o;
  });
}
const D = (n, d) => ({ name: n, ...(d || {}) });
const M = n => ({ name: n });
const eqName = v => ({ filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: v } } });
const beginsWith = (field, v) => ({ filter: { fieldName: field, stringFilter: { matchType: 'BEGINS_WITH', value: v } } });
const inList = (field, values) => ({ filter: { fieldName: field, inListFilter: { values } } });
const humanize = s => String(s || '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

function build(site, days) {
  const cur = { startDate: `${days - 1}daysAgo`, endDate: 'today' };
  const prev = { startDate: `${2 * days - 1}daysAgo`, endDate: `${days}daysAgo` };
  const both = [cur, prev];
  const reqs = {
    totals: { dateRanges: both, metrics: ['sessions', 'totalUsers', 'newUsers', 'engagedSessions', 'engagementRate', 'averageSessionDuration', 'screenPageViews', 'userEngagementDuration'].map(M) },
    daily: { dateRanges: [cur], dimensions: [D('date')], metrics: [M('sessions'), M('totalUsers')], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
    channels: { dateRanges: [cur], dimensions: [D('sessionDefaultChannelGroup')], metrics: [M('sessions'), M('totalUsers')], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 },
    sources: { dateRanges: [cur], dimensions: [D('sessionSourceMedium')], metrics: [M('sessions')], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 },
    devices: { dateRanges: [cur], dimensions: [D('deviceCategory')], metrics: [M('sessions'), M('engagementRate'), M('averageSessionDuration')], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 5 },
    pages: { dateRanges: [cur], dimensions: [D('pagePath')], metrics: [M('screenPageViews'), M('totalUsers'), M('userEngagementDuration')], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 12 },
    cities: { dateRanges: [cur], dimensions: [D('city')], metrics: [M('sessions')], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 },
    events: { dateRanges: both, dimensions: [D('eventName')], metrics: [M('eventCount'), M('totalUsers'), M('eventValue')], limit: 1000 },
  };
  if (site.kind === 'v4') {
    reqs.abSessions = { dateRanges: [cur], dimensions: [D('pagePathPlusQueryString')], metrics: ['sessions', 'totalUsers', 'engagedSessions', 'averageSessionDuration', 'userEngagementDuration'].map(M),
      dimensionFilter: beginsWith('pagePathPlusQueryString', '/?ab='), limit: 10 };
    reqs.abEvents = { dateRanges: [cur], dimensions: [D('pagePathPlusQueryString'), D('eventName')], metrics: [M('eventCount'), M('totalUsers'), M('eventValue')],
      dimensionFilter: { andGroup: { expressions: [beginsWith('pagePathPlusQueryString', '/?ab='),
        { orGroup: { expressions: ['generate_lead', 'video_open', 'quiz_answer', 'form_start', 'section_view_', 'scroll_depth_', 'cta_click_get_started', 'cta_click_send_us_an_email', 'outcome_open', 'videos_watched', 'card_swipe'].map(v => beginsWith('eventName', v)) } }] } }, limit: 1000 };
  }
  return reqs;
}

function summarize(site, days, reps, extra) {
  const T = table(reps.totals);
  const tot = k => { const r = T.find(x => x.dateRange === 'date_range_0') || T[0] || {}; return num(r[k]); };
  const ptot = k => { const r = T.find(x => x.dateRange === 'date_range_1') || {}; return num(r[k]); };
  const E = table(reps.events);
  const ev = (name, which = 'date_range_0') => E.find(x => x.eventName === name && x.dateRange === which) || { eventCount: 0, totalUsers: 0, eventValue: 0 };
  const leadsFor = which => site.leads.reduce((s, group) => s + Math.max(...group.map(n => ev(n, which).eventCount)), 0);
  const isKeyed = n => FAMILIES.some(f => n.startsWith(f + '_'));

  const totals = {
    sessions: tot('sessions'), users: tot('totalUsers'), newUsers: tot('newUsers'), engagedSessions: tot('engagedSessions'),
    engagementRate: tot('engagementRate'), avgSessionSec: tot('averageSessionDuration'), pageViews: tot('screenPageViews'),
    engagementSec: tot('userEngagementDuration'), leads: leadsFor('date_range_0'),
    videoOpens: ev('video_open').eventCount, videoUsers: ev('video_open').totalUsers,
    prev: { sessions: ptot('sessions'), users: ptot('totalUsers'), newUsers: ptot('newUsers'), engagedSessions: ptot('engagedSessions'), engagementRate: ptot('engagementRate'),
      avgSessionSec: ptot('averageSessionDuration'), pageViews: ptot('screenPageViews'), leads: leadsFor('date_range_1'), videoOpens: ev('video_open', 'date_range_1').eventCount },
  };

  // interactions: family names only (keyed copies are for the breakdowns below)
  const interactions = E.filter(x => x.dateRange === 'date_range_0' && !GA_INTERNAL.has(x.eventName) && !isKeyed(x.eventName) && !/^(section_time|section_view|scroll_depth|video_watch|videos_watched|video_from|lead_error)$/.test(x.eventName))
    .map(x => ({ key: x.eventName, label: LABELS[x.eventName] || humanize(x.eventName), count: x.eventCount, users: x.totalUsers }))
    .sort((a, b) => b.count - a.count).slice(0, 14);

  // scroll depth: v4 event names; client sites via the registered param; fallback to Google's own 90% event
  let scroll = [];
  if (site.kind === 'v4') scroll = [25, 50, 75, 100].map(p => ({ pct: p, users: ev('scroll_depth_' + p).totalUsers, count: ev('scroll_depth_' + p).eventCount }));
  else if (extra.scroll && extra.scroll.length) scroll = extra.scroll.filter(r => /^\d+$/.test(r['customEvent:percent_scrolled'])).map(r => ({ pct: num(r['customEvent:percent_scrolled']), users: r.totalUsers, count: r.eventCount })).sort((a, b) => a.pct - b.pct);
  if (!scroll.length && ev('scroll').eventCount) scroll = [{ pct: 90, users: ev('scroll').totalUsers, count: ev('scroll').eventCount, googleOwn: true }];
  const scrollBase = Math.max(ev('page_view').totalUsers, totals.users, 1);

  // clicks: v4 keyed cta names; client sites via button_text when it is registered
  let clicks = [];
  if (site.kind === 'v4') clicks = E.filter(x => x.dateRange === 'date_range_0' && /^cta_click_/.test(x.eventName)).map(x => ({ label: humanize(x.eventName.replace(/^cta_click_/, '')), count: x.eventCount, users: x.totalUsers })).sort((a, b) => b.count - a.count).slice(0, 15);
  else if (extra.clicks) clicks = extra.clicks.map(r => ({ label: `${r['customEvent:button_text'] || '(no text)'}${r.eventName === 'phone_click' ? ' (phone)' : r.eventName === 'email_click' ? ' (email)' : ''}`, count: r.eventCount, users: r.totalUsers })).filter(c => !CHROME.test(c.label)).sort((a, b) => b.count - a.count).slice(0, 15);

  const out = {
    ok: true, site: extra.slug, name: site.name, host: site.host, kind: site.kind || 'site', days, updatedAt: new Date().toISOString(),
    property: extra.property, totals, interactions, scroll, scrollBase, clicks,
    daily: table(reps.daily).map(r => ({ date: r.date, sessions: r.sessions, users: r.totalUsers })),
    channels: table(reps.channels).map(r => ({ name: r.sessionDefaultChannelGroup, sessions: r.sessions, users: r.totalUsers })),
    sources: table(reps.sources).map(r => ({ name: r.sessionSourceMedium, sessions: r.sessions })),
    devices: table(reps.devices).map(r => ({ name: r.deviceCategory, sessions: r.sessions, engagementRate: r.engagementRate, avgSessionSec: r.averageSessionDuration })),
    pages: table(reps.pages).map(r => ({ path: r.pagePath, views: r.screenPageViews, users: r.totalUsers, avgEngageSec: r.screenPageViews ? r.userEngagementDuration / r.screenPageViews : 0 })),
    cities: table(reps.cities).map(r => ({ name: r.city, sessions: r.sessions })).filter(c => c.name && c.name !== '(not set)'),
  };

  if (site.kind === 'v4') {
    out.sections = V4_SECTIONS.map(([key, label]) => { const v = ev('section_view_' + key), t = ev('section_time_' + key); return { key, label, users: v.totalUsers, timeEvents: t.eventCount, totalSec: t.eventValue, avgSec: t.eventCount ? t.eventValue / t.eventCount : 0 }; });
    const vids = new Map();
    E.filter(x => x.dateRange === 'date_range_0').forEach(x => {
      let m = x.eventName.match(/^video_open_([0-9a-f]{24})$/); if (m) { const v = vids.get(m[1]) || { id: m[1], opens: 0, users: 0, watchEvents: 0, watchSec: 0 }; v.opens = x.eventCount; v.users = x.totalUsers; vids.set(m[1], v); }
      m = x.eventName.match(/^video_watch_([0-9a-f]{24})$/); if (m) { const v = vids.get(m[1]) || { id: m[1], opens: 0, users: 0, watchEvents: 0, watchSec: 0 }; v.watchEvents = x.eventCount; v.watchSec = x.eventValue; vids.set(m[1], v); }
    });
    out.videos = [...vids.values()].map(v => ({ ...v, avgWatchSec: v.watchEvents ? v.watchSec / v.watchEvents : 0 })).sort((a, b) => b.opens - a.opens).slice(0, 20);
    out.videoSurfaces = E.filter(x => x.dateRange === 'date_range_0' && /^video_from_/.test(x.eventName)).map(x => ({ surface: x.eventName.replace(/^video_from_/, ''), count: x.eventCount })).sort((a, b) => b.count - a.count);
    const vw = ev('videos_watched');
    out.videosPerVisit = { avg: vw.eventCount ? vw.eventValue / vw.eventCount : 0, visits: vw.eventCount, dist: ['1', '2', '3', '4', '5plus'].map(k => ({ n: k, count: ev('videos_watched_' + k).eventCount })) };
    out.quiz = E.filter(x => x.dateRange === 'date_range_0' && /^quiz_answer_/.test(x.eventName)).map(x => ({ label: humanize(x.eventName.replace(/^quiz_answer_/, '')), count: x.eventCount })).sort((a, b) => b.count - a.count);
    out.outcomes = E.filter(x => x.dateRange === 'date_range_0' && /^outcome_open_/.test(x.eventName)).map(x => ({ label: humanize(x.eventName.replace(/^outcome_open_/, '')), count: x.eventCount })).sort((a, b) => b.count - a.count);
    out.forms = ['hero', 'contact', 'outcome'].map(f => ({ form: f, starts: ev('form_start_' + f).eventCount, sent: ev('lead_submit_' + f).eventCount }));
    // A/B: hero first (a) vs "How we can help" first (b)
    const AS = table(reps.abSessions), AE = table(reps.abEvents);
    const variant = v => {
      const s = AS.find(r => (r.pagePathPlusQueryString || '').startsWith('/?ab=' + v)) || {};
      const e = name => AE.filter(r => (r.pagePathPlusQueryString || '').startsWith('/?ab=' + v) && r.eventName === name).reduce((a, r) => ({ count: a.count + r.eventCount, users: a.users + r.totalUsers, value: a.value + r.eventValue }), { count: 0, users: 0, value: 0 });
      const sessions = num(s.sessions), users = num(s.totalUsers);
      return { sessions, users, engagedSessions: num(s.engagedSessions), engagementRate: sessions ? num(s.engagedSessions) / sessions : 0, avgSessionSec: num(s.averageSessionDuration),
        leads: e('generate_lead').count, formStarts: e('form_start').count, quizAnswers: e('quiz_answer').users, videoOpens: e('video_open').count, videoUsers: e('video_open').users,
        outcomeOpens: e('outcome_open').count, getStarted: e('cta_click_get_started').count, sendEmail: e('cta_click_send_us_an_email').count, swipes: e('card_swipe').count,
        reachedHelp: e('section_view_help').users, reachedHero: e('section_view_hero').users, reachedContact: e('section_view_contact').users, scroll50: e('scroll_depth_50').users, scroll100: e('scroll_depth_100').users,
        leadRate: sessions ? e('generate_lead').count / sessions : 0, videoRate: users ? e('video_open').users / users : 0 };
    };
    out.ab = { a: variant('a'), b: variant('b'), labels: { a: 'Hero first (quiz + films)', b: '"How we can help" first' } };
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const q = req.query || {};
  const want = process.env.ANALYTICS_KEY;
  if (!want) return res.status(503).json({ ok: false, error: 'Report key is not configured (ANALYTICS_KEY).' });
  const got = q.key || req.headers['x-analytics-key'];
  if (got !== want) return res.status(401).json({ ok: false, error: 'Bad or missing report key.' });
  const slug = String(q.site || '').toLowerCase();
  const site = SITES[slug];
  if (!site) return res.status(404).json({ ok: false, error: 'Unknown site.', sites: Object.keys(SITES) });
  const days = Math.max(1, Math.min(365, parseInt(q.days, 10) || 28));
  const ck = `${slug}:${days}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000 && !q.fresh) return res.status(200).json({ ...hit.data, cached: true });
  try {
    const token = await accessToken();
    const property = await resolveProperty(site, token);
    if (!property) return res.status(200).json({ ok: false, noAccess: true, site: slug, name: site.name, host: site.host, measurement: site.measurement, grant: loadKey().client_email });
    const reqs = build(site, days);
    const names = Object.keys(reqs);
    const reports = await runBatch(property, token, names.map(n => reqs[n]));
    const reps = {}; names.forEach((n, i) => { reps[n] = reports[i]; });
    const cur = [{ startDate: `${days - 1}daysAgo`, endDate: 'today' }];
    const extra = { slug, property };
    if (site.kind !== 'v4') {
      const [sc, cl] = await Promise.all([
        soft(runReport(property, token, { dateRanges: cur, dimensions: [D('customEvent:percent_scrolled')], metrics: [M('totalUsers'), M('eventCount')], dimensionFilter: eqName('scroll_depth'), limit: 20 })),
        soft(runReport(property, token, { dateRanges: cur, dimensions: [D('eventName'), D('customEvent:button_text')], metrics: [M('eventCount'), M('totalUsers')], dimensionFilter: inList('eventName', ['button_click', 'phone_click', 'email_click', 'cta_click']), orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 30 })),
      ]);
      extra.scroll = table(sc); extra.clicks = cl ? table(cl) : null;
    }
    const data = summarize(site, days, reps, extra);
    cache.set(ck, { at: Date.now(), data });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e).slice(0, 400) });
  }
}
