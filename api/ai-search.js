// Scout -- sourcing.directory search agent
// No external AI API. Smart parser + Supabase. The data IS the answer.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mcngatprgluexjjcqpkp.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbmdhdHByZ2x1ZXhqamNxcGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyNTcxNSwiZXhwIjoyMDg5NDAxNzE1fQ.4thmVan7mq2MtnbI-AGynfNZBTUA3QGXKtpDJlzSPlg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── SMART PARSER ────────────────────────────────────────────────────────────
// Scout's brain. No AI model. Just pattern matching against known vocabulary.

const VERTICAL_MAP = {
  semiconductor: ['semiconductor', 'semi', 'chip', 'fab', 'wafer', 'silicon', 'microchip', 'foundry'],
  space: ['space', 'aerospace', 'satellite', 'rocket', 'orbital', 'balloon', 'stratospheric', 'avionics'],
  biotech: ['biotech', 'bio', 'health', 'medical', 'pharma', 'genomic', 'diagnostic', 'clinical', 'life science'],
  defense: ['defense', 'defence', 'military', 'missile', 'weapons', 'tactical', 'dod', 'army', 'navy', 'air force'],
};

const CERT_MAP = {
  'ISO 9001': ['iso 9001', 'iso9001', 'quality management'],
  'AS9100D': ['as9100', 'as 9100', 'aerospace quality'],
  'ITAR Registered': ['itar', 'export control'],
  'NADCAP': ['nadcap', 'special process'],
  'ISO 13485': ['iso 13485', 'iso13485', 'medical device'],
  'CMMC': ['cmmc', 'cybersecurity maturity'],
  'CMMC Level 2': ['cmmc level 2', 'cmmc 2'],
  'ISO 14001': ['iso 14001', 'environmental'],
  'cGMP': ['cgmp', 'good manufacturing'],
  'MIL-STD-810': ['mil-std', 'mil std', 'military standard'],
  'DoD Secret Cleared': ['secret cleared', 'dod cleared', 'clearance', 'cleared'],
  'IATF 16949': ['iatf', '16949', 'automotive quality'],
  'FDA 21 CFR Part 820': ['fda', '21 cfr', 'part 820'],
};

const AZ_CITIES = [
  'phoenix', 'scottsdale', 'tempe', 'mesa', 'chandler', 'gilbert', 'glendale',
  'tucson', 'peoria', 'surprise', 'goodyear', 'avondale', 'flagstaff', 'yuma',
  'prescott', 'sedona', 'sierra vista', 'casa grande', 'maricopa', 'oro valley',
];

const SIZE_PATTERNS = [
  { pattern: /(?:under|less than|fewer than|<)\s*(\d+)/i, type: 'max' },
  { pattern: /(?:over|more than|greater than|above|>)\s*(\d+)/i, type: 'min' },
  { pattern: /(\d+)\s*(?:employees?|people|workers|staff|team)/i, type: 'exact' },
  { pattern: /\b(small|tiny|startup)\b/i, type: 'small' },
  { pattern: /\b(medium|mid-?size)\b/i, type: 'medium' },
  { pattern: /\b(large|big|major|enterprise)\b/i, type: 'large' },
];

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000-5000', '5000-10000', '10000+'];

function parseQuery(query) {
  const lower = query.toLowerCase().trim();
  const result = {
    vertical: null,
    certifications: [],
    location: null,
    employee_ranges: null,
    keywords: [],
    summary: '',
  };

  let remaining = lower;

  // Extract vertical
  for (const [vertical, triggers] of Object.entries(VERTICAL_MAP)) {
    if (triggers.some(t => lower.includes(t))) {
      result.vertical = vertical;
      triggers.forEach(t => { remaining = remaining.replace(new RegExp(t, 'gi'), ''); });
      break;
    }
  }

  // Extract certifications
  for (const [certName, triggers] of Object.entries(CERT_MAP)) {
    if (triggers.some(t => lower.includes(t))) {
      result.certifications.push(certName);
      triggers.forEach(t => { remaining = remaining.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ''); });
    }
  }

  // Extract location
  for (const city of AZ_CITIES) {
    if (lower.includes(city)) {
      result.location = city.charAt(0).toUpperCase() + city.slice(1);
      remaining = remaining.replace(new RegExp(city, 'gi'), '');
      break;
    }
  }

  // Extract employee size
  for (const { pattern, type } of SIZE_PATTERNS) {
    const match = lower.match(pattern);
    if (match) {
      if (type === 'small') {
        result.employee_ranges = ['1-10', '11-50'];
      } else if (type === 'medium') {
        result.employee_ranges = ['51-200', '201-500'];
      } else if (type === 'large') {
        result.employee_ranges = ['501-1000', '1000-5000', '5000-10000', '10000+'];
      } else {
        const num = parseInt(match[1], 10);
        if (type === 'max') {
          result.employee_ranges = EMPLOYEE_RANGES.filter(r => {
            const [lo] = r.replace('+', '').split('-').map(Number);
            return lo < num;
          });
        } else if (type === 'min') {
          result.employee_ranges = EMPLOYEE_RANGES.filter(r => {
            const parts = r.replace('+', '').split('-').map(Number);
            const hi = parts[1] || 999999;
            return hi > num;
          });
        } else {
          // exact -- find the range that contains this number
          result.employee_ranges = EMPLOYEE_RANGES.filter(r => {
            if (r.endsWith('+')) return num >= parseInt(r, 10);
            const [lo, hi] = r.split('-').map(Number);
            return num >= lo && num <= hi;
          });
        }
      }
      remaining = remaining.replace(pattern, '');
      break;
    }
  }

  // Remaining words become keywords (clean up filler)
  const filler = ['i', 'im', "i'm", 'am', 'a', 'an', 'the', 'for', 'with', 'in', 'and', 'or', 'that',
    'looking', 'need', 'want', 'find', 'show', 'me', 'companies', 'company', 'who', 'what', 'which',
    'are', 'is', 'has', 'have', 'can', 'do', 'does', 'any', 'some', 'to', 'of', 'at', 'on', 'by',
    'suppliers', 'partners', 'certified', 'team', 'employees', 'people', 'workers'];
  result.keywords = remaining.split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 1 && !filler.includes(w));

  // Build summary
  const parts = [];
  if (result.employee_ranges) {
    const sizeWord = result.employee_ranges.includes('1-10') ? 'small' :
      result.employee_ranges.includes('10000+') ? 'large' : 'mid-size';
    parts.push(sizeWord);
  }
  if (result.certifications.length) parts.push(result.certifications.join(' + ') + ' certified');
  if (result.vertical) {
    const vLabel = { semiconductor: 'semiconductor', space: 'space & aerospace', biotech: 'biotech', defense: 'defense' }[result.vertical];
    parts.push(vLabel);
  }
  parts.push('companies');
  if (result.location) parts.push(`in ${result.location}`);
  if (result.keywords.length) parts.push(`matching "${result.keywords.join(' ')}"`);
  result.summary = `Found ${parts.join(' ')} in Arizona.`;

  return result;
}

// ─── SUPABASE QUERY ──────────────────────────────────────────────────────────

async function queryDirectory(parsed) {
  let query = supabase
    .from('directory_companies')
    .select('*, directory_certifications(*), directory_organizations(name, slug)')
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('name', { ascending: true });

  if (parsed.vertical) {
    query = query.eq('vertical', parsed.vertical);
  }

  if (parsed.location) {
    query = query.ilike('city', `%${parsed.location}%`);
  }

  if (parsed.employee_ranges && parsed.employee_ranges.length > 0) {
    query = query.in('employee_count', parsed.employee_ranges);
  }

  if (parsed.keywords.length > 0) {
    const kw = parsed.keywords.join(' & ');
    query = query.or(`name.ilike.%${parsed.keywords[0]}%,description.ilike.%${parsed.keywords[0]}%`);
  }

  const { data, error } = await query.limit(25);
  if (error) throw error;

  // Filter by certifications post-query (join filter)
  let results = data || [];
  if (parsed.certifications.length > 0) {
    results = results.filter(company => {
      const companyCerts = (company.directory_certifications || []).map(c => c.cert_name);
      return parsed.certifications.every(cert => companyCerts.includes(cert));
    });
  }

  return results;
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing query' });
    }

    // Parse the natural language query
    const parsed = parseQuery(query);

    // Query the directory
    const results = await queryDirectory(parsed);

    // Update summary with actual count
    parsed.summary = parsed.summary.replace('Found ', `Found ${results.length} `);

    // Build suggestion
    let suggestion = null;
    if (results.length === 0) {
      suggestion = parsed.vertical
        ? `Try broadening your search -- remove the ${parsed.vertical} filter or try different keywords.`
        : `Try searching by vertical: "semiconductor companies" or "defense in Tucson"`;
    } else if (results.length > 10 && !parsed.certifications.length) {
      suggestion = `Narrow it down with a certification: "ITAR certified ${parsed.vertical || ''} companies"`;
    } else if (!parsed.vertical && results.length > 5) {
      suggestion = `Filter by industry: "semiconductor", "space", "biotech", or "defense"`;
    }

    return res.status(200).json({
      summary: parsed.summary,
      filters_applied: {
        vertical: parsed.vertical,
        employee_range: parsed.employee_ranges ? parsed.employee_ranges.join(', ') : null,
        certifications: parsed.certifications,
        location: parsed.location,
        keywords: parsed.keywords.join(' '),
      },
      results,
      count: results.length,
      suggestion,
    });
  } catch (err) {
    console.error('Scout error:', err);
    return res.status(500).json({ error: 'Scout encountered an error', details: err.message });
  }
}
