// AI Search endpoint for sourcing.directory
// Parses natural language queries into structured Supabase filters via Claude Haiku

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mcngatprgluexjjcqpkp.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbmdhdHByZ2x1ZXhqamNxcGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyNTcxNSwiZXhwIjoyMDg5NDAxNzE1fQ.4thmVan7mq2MtnbI-AGynfNZBTUA3QGXKtpDJlzSPlg';

const SYSTEM_PROMPT = `You are Scout, the directory intelligence agent for sourcing.directory. You know Arizona's tech ecosystem -- every semiconductor fab, space company, biotech lab, and defense contractor. You speak like a local industry insider, not a chatbot. You're helpful, direct, and suggest next steps.

You serve sourcing.directory, an Arizona industry directory with 107+ companies across 4 verticals: semiconductor, space, biotech, defense.

Given a natural language query, extract structured filters:
- vertical: semiconductor | space | biotech | defense | null (all)
- employee_range: specific ranges like "1-10", "11-50", "51-200", "201-500", "501-1000", "1000-5000", "5000-10000", "10000+" | null
- certifications: array of strings from: ISO 9001, AS9100D, ITAR, ITAR Registered, NADCAP, ISO 13485, CMMC, CMMC Level 2, MIL-STD-810, DoD Secret Cleared, cGMP, ISO 14001 | empty array
- location: city name in AZ | null
- keywords: any remaining search terms for name/description matching | empty string

Also write a brief, friendly 1-sentence summary of what you're searching for.

Return JSON only, no markdown, no explanation:
{
  "vertical": "space",
  "employee_range": "11-50",
  "certifications": ["ITAR Registered"],
  "location": null,
  "keywords": "",
  "summary": "Looking for small space companies with ITAR certification in Arizona."
}`;

function parseEmployeeRange(rangeStr) {
  if (!rangeStr) return null;
  // Parse ranges like "1-10", "11-50", "10000+"
  if (rangeStr.endsWith('+')) {
    const min = parseInt(rangeStr.replace('+', ''), 10);
    return { min, max: null };
  }
  const parts = rangeStr.split('-');
  if (parts.length === 2) {
    return { min: parseInt(parts[0], 10), max: parseInt(parts[1], 10) };
  }
  return null;
}

function buildSuggestion(filters, count) {
  const suggestions = [];
  if (!filters.certifications || filters.certifications.length === 0) {
    if (filters.vertical === 'space') suggestions.push('ITAR certified space companies');
    else if (filters.vertical === 'semiconductor') suggestions.push('ISO 9001 certified semiconductor companies');
    else if (filters.vertical === 'defense') suggestions.push('CMMC Level 2 defense contractors');
    else if (filters.vertical === 'biotech') suggestions.push('ISO 13485 biotech companies');
  }
  if (!filters.employee_range && count > 10) {
    suggestions.push('small teams under 50 employees');
  }
  if (!filters.location && count > 10) {
    suggestions.push('companies in Scottsdale or Tempe');
  }
  if (suggestions.length > 0) {
    return `Try: "${suggestions[0]}" for more specific results`;
  }
  return null;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body || {};
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'query is required' });
  }

  // ── Step 1: Parse intent with Claude Haiku ──────────────────────────────────
  let filters;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query.trim() }],
    });

    const raw = message.content[0]?.text?.trim() || '{}';

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    filters = JSON.parse(cleaned);
  } catch (err) {
    console.error('Claude parse error:', err);
    // Fallback: treat entire query as keyword search
    filters = {
      vertical: null,
      employee_range: null,
      certifications: [],
      location: null,
      keywords: query.trim(),
      summary: `Searching for "${query.trim()}" in the Arizona industry directory.`,
    };
  }

  // ── Step 2: Build Supabase query from parsed filters ────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    let qb = supabase
      .from('directory_companies')
      .select('*, directory_certifications(*)')
      .eq('status', 'active')
      .order('featured', { ascending: false })
      .order('name', { ascending: true });

    // Vertical filter
    if (filters.vertical) {
      qb = qb.eq('vertical', filters.vertical);
    }

    // Location filter
    if (filters.location) {
      qb = qb.ilike('city', `%${filters.location}%`);
    }

    // Keyword search on name + description
    if (filters.keywords && filters.keywords.trim()) {
      qb = qb.or(`name.ilike.%${filters.keywords}%,description.ilike.%${filters.keywords}%`);
    }

    const { data: companies, error } = await qb.limit(100);
    if (error) throw error;

    let results = companies || [];

    // Employee range filter (post-query since employee_count is a string range)
    if (filters.employee_range) {
      const range = parseEmployeeRange(filters.employee_range);
      if (range) {
        results = results.filter(c => {
          if (!c.employee_count) return false;
          // employee_count field is a string like "201-500" or "1000+"
          // Extract the lower bound of the company's stated range for comparison
          const companyStr = c.employee_count.toString().replace(/[^0-9\-+]/g, '');
          let companyMin = 0;
          if (companyStr.includes('-')) {
            companyMin = parseInt(companyStr.split('-')[0], 10);
          } else if (companyStr.endsWith('+')) {
            companyMin = parseInt(companyStr.replace('+', ''), 10);
          } else {
            companyMin = parseInt(companyStr, 10);
          }

          if (range.max === null) {
            // "10000+" filter: include companies with lower bound >= range.min
            return companyMin >= range.min;
          }
          // Range filter: company lower bound must fall within range
          return companyMin >= range.min && companyMin <= range.max;
        });
      }
    }

    // Certification filter (post-query)
    if (filters.certifications && filters.certifications.length > 0) {
      const certTerms = filters.certifications.map(c => c.toLowerCase());
      results = results.filter(c => {
        const companyCerts = (c.directory_certifications || []).map(cert =>
          cert.cert_name.toLowerCase()
        );
        return certTerms.some(term =>
          companyCerts.some(cc => cc.includes(term) || term.includes(cc.split(' ')[0]))
        );
      });
    }

    // Build response
    const count = results.length;
    const filtersApplied = {};
    if (filters.vertical) filtersApplied.vertical = filters.vertical;
    if (filters.employee_range) filtersApplied.employee_range = filters.employee_range;
    if (filters.certifications && filters.certifications.length > 0) filtersApplied.certifications = filters.certifications;
    if (filters.location) filtersApplied.location = filters.location;
    if (filters.keywords) filtersApplied.keywords = filters.keywords;

    // Adjust summary to include count
    let summary = filters.summary || `Found ${count} compan${count === 1 ? 'y' : 'ies'} matching your search.`;
    if (!summary.toLowerCase().includes('found') && !summary.toLowerCase().includes('showing')) {
      summary = `Found ${count} compan${count === 1 ? 'y' : 'ies'}. ${summary}`;
    }

    const suggestion = buildSuggestion(filters, count);

    // Clean up the nested certs from company objects (already in separate field)
    const cleanResults = results.map(c => {
      const { directory_certifications, ...rest } = c;
      return {
        ...rest,
        certs: directory_certifications || [],
      };
    });

    return res.status(200).json({
      summary,
      filters_applied: filtersApplied,
      results: cleanResults,
      count,
      suggestion,
    });
  } catch (err) {
    console.error('Supabase query error:', err);
    return res.status(500).json({ error: 'Database query failed', detail: err.message });
  }
}
