// csvAudience — shared audience materialization for the campaign wizard
// (corner:campaign-tool R6). Used by campaign-audience.js (preview) and
// campaigns.js (create): one parser, one mapping contract, so what the user
// previews is exactly what gets created.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// header names we can auto-map, per schema field
export const HEADER_GUESSES = {
  email: ['email', 'contact_email', 'e-mail', 'mail'],
  name: ['name', 'contact_name', 'full name', 'contact'],
  first_name: ['first', 'first_name', 'firstname'],
  city: ['city', 'municipality', 'town', 'place'],
  state: ['state', 'state_abbr', 'st', 'province'],
  company: ['company', 'organization', 'org'],
};

export function parseCsv(text, maxRows = 25001) {
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

export function guessMapping(headers) {
  const mapping = {};
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const [target, names] of Object.entries(HEADER_GUESSES)) {
    const idx = lower.findIndex((h) => names.includes(h));
    if (idx >= 0) mapping[target] = headers[idx];
  }
  return mapping;
}

// CSV text + column mapping -> contact rows ready for campaign_contacts.
// Returns { contacts, skipped: {noEmail, badEmail, dupes} }.
export function csvToContacts(csvText, mapping) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return { contacts: [], skipped: { noEmail: 0, badEmail: 0, dupes: 0 } };
  const headers = rows[0].map((h) => h.trim());
  const col = {};
  for (const [target, header] of Object.entries(mapping || {})) {
    const idx = headers.indexOf(header);
    if (idx >= 0) col[target] = idx;
  }
  const contacts = [];
  const seen = new Set();
  const skipped = { noEmail: 0, badEmail: 0, dupes: 0 };
  for (const row of rows.slice(1)) {
    const get = (t) => (col[t] != null ? String(row[col[t]] || '').trim() : '');
    const email = get('email').toLowerCase();
    if (!email) { skipped.noEmail++; continue; }
    if (!EMAIL_RE.test(email)) { skipped.badEmail++; continue; }
    if (seen.has(email)) { skipped.dupes++; continue; }
    seen.add(email);
    const name = get('name');
    const merge = {};
    for (const t of ['first_name', 'city', 'state', 'company']) {
      const v = get(t);
      if (v) merge[t] = t === 'state' ? v.toUpperCase() : v;
    }
    if (!merge.first_name && name) merge.first_name = name.split(/\s+/)[0];
    contacts.push({ email, name: name || null, merge_fields: merge });
  }
  return { contacts, skipped };
}

// Municipality-dataset filters -> contact rows. `places` is the parsed
// arsenal-municipality-data.json places array.
export function datasetToContacts(places, filters = {}) {
  const states = Array.isArray(filters.states) && filters.states.length
    ? new Set(filters.states.map((s) => String(s).toUpperCase()))
    : null;
  const popMin = Number.isFinite(+filters.pop_min) ? +filters.pop_min : null;
  const popMax = Number.isFinite(+filters.pop_max) ? +filters.pop_max : null;
  const cleanCity = (n) =>
    (n || '').replace(/\s+(town|city|village|borough|township|cdp|municipality)$/i, '').trim();

  const contacts = [];
  const seenEmail = new Set();
  for (const p of places) {
    if (states && !states.has(p.state_abbr)) continue;
    const pop = p.population_2020 || 0;
    if (popMin != null && pop < popMin) continue;
    if (popMax != null && pop > popMax) continue;
    let email = (p.contact_email || '').trim().toLowerCase() || null;
    if (email && (!EMAIL_RE.test(email) || seenEmail.has(email))) email = null;
    if (email) seenEmail.add(email);
    contacts.push({
      email,
      name: (p.contact_name || '').trim() || null,
      place_key: p.geoid,
      merge_fields: {
        first_name: (p.contact_name || '').trim().split(/\s+/)[0] || null,
        city: cleanCity(p.name),
        state: p.state_abbr,
        population: pop,
      },
    });
  }
  return { contacts };
}
