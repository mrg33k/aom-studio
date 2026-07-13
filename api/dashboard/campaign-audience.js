// /api/dashboard/campaign-audience — corner:campaign-tool R3.
// Wizard audience helpers. No rows are written here; the wizard submits the
// final contact list to POST /api/dashboard/campaigns.
//   GET  ?world=                       — available dataset sources
//   POST {world, op:'preview_dataset', dataset:'us-municipalities',
//         filters:{states:[..], pop_min, pop_max}}   — count + sample
//   POST {world, op:'parse_csv', csv:'<raw text>'}   — headers, guessed
//         mapping, validation stats, sample rows

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const DATASET_PATH = '/arsenal-municipality-data.json'; // served from public/

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// header names we can auto-map, per schema field
const GUESSES = {
  email: ['email', 'contact_email', 'e-mail', 'mail'],
  name: ['name', 'contact_name', 'full name', 'contact'],
  first_name: ['first', 'first_name', 'firstname'],
  city: ['city', 'municipality', 'town', 'place'],
  state: ['state', 'state_abbr', 'st', 'province'],
  company: ['company', 'organization', 'org'],
};

function parseCsv(text, maxRows = 25001) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      if (rows.length >= maxRows) break;
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function guessMapping(headers) {
  const mapping = {};
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const [target, names] of Object.entries(GUESSES)) {
    const idx = lower.findIndex((h) => names.includes(h));
    if (idx >= 0) mapping[target] = headers[idx];
  }
  return mapping;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const requested =
    (typeof req.query.world === 'string' && req.query.world.trim()) ||
    (req.body && typeof req.body.world === 'string' && req.body.world.trim()) ||
    'aom';
  try {
    await verifyTenant(requested, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        datasets: [
          {
            id: 'us-municipalities',
            label: 'US Municipality Directory',
            description: 'All 19,475 incorporated US cities, towns, and villages (2024 Census Gazetteer).',
            filters: ['states', 'pop_min', 'pop_max'],
          },
        ],
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
    const b = req.body || {};

    if (b.op === 'preview_dataset') {
      if (b.dataset !== 'us-municipalities') {
        return res.status(400).json({ error: 'unknown dataset' });
      }
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const r = await fetch(`${proto}://${host}${DATASET_PATH}`);
      if (!r.ok) return res.status(502).json({ error: 'dataset fetch failed' });
      const places = (await r.json()).places || [];

      const f = b.filters || {};
      const states = Array.isArray(f.states) && f.states.length
        ? new Set(f.states.map((s) => String(s).toUpperCase()))
        : null;
      const popMin = Number.isFinite(+f.pop_min) ? +f.pop_min : null;
      const popMax = Number.isFinite(+f.pop_max) ? +f.pop_max : null;

      const matches = places.filter((p) => {
        if (states && !states.has(p.state_abbr)) return false;
        const pop = p.population_2020 || 0;
        if (popMin != null && pop < popMin) return false;
        if (popMax != null && pop > popMax) return false;
        return true;
      });
      const withEmail = matches.filter((p) => p.contact_email).length;
      return res.status(200).json({
        ok: true,
        count: matches.length,
        withEmail,
        sample: matches.slice(0, 5).map((p) => ({
          name: p.name,
          state: p.state_abbr,
          population: p.population_2020,
          hasEmail: !!p.contact_email,
        })),
      });
    }

    if (b.op === 'parse_csv') {
      const csv = String(b.csv || '');
      if (!csv.trim()) return res.status(400).json({ error: 'csv required' });
      if (csv.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'csv too large (8MB max)' });
      const rows = parseCsv(csv);
      if (rows.length < 2) return res.status(400).json({ error: 'csv needs a header row and at least one data row' });
      const headers = rows[0].map((h) => h.trim());
      const mapping = { ...guessMapping(headers), ...(b.mapping || {}) };
      const emailCol = headers.indexOf(mapping.email);
      let valid = 0;
      let badEmail = 0;
      let noEmail = 0;
      const seen = new Set();
      let dupes = 0;
      for (const row of rows.slice(1)) {
        const email = emailCol >= 0 ? (row[emailCol] || '').trim().toLowerCase() : '';
        if (!email) { noEmail++; continue; }
        if (!EMAIL_RE.test(email)) { badEmail++; continue; }
        if (seen.has(email)) { dupes++; continue; }
        seen.add(email);
        valid++;
      }
      return res.status(200).json({
        ok: true,
        headers,
        mapping,
        totalRows: rows.length - 1,
        valid,
        skipped: { noEmail, badEmail, dupes },
        sample: rows.slice(1, 6).map((row) =>
          Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
        ),
      });
    }

    return res.status(400).json({ error: `unknown op ${b.op}` });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
}
