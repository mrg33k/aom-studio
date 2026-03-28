// POST /api/sourcing/agent
// Scout Agent -- directory manager (admin) + search agent (scout)
// Streams SSE: tool_call events for pills, text deltas, done

import { createClient } from '@supabase/supabase-js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://mcngatprgluexjjcqpkp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function getClient(isAdmin) {
  const key = isAdmin ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key);
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const ADMIN_TOOLS = [
  {
    name: 'create_org',
    description: 'Create a new organization/directory (e.g. Arizona Biotech Council). Returns the new org URL.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Display name' },
        slug: { type: 'string', description: 'URL slug (auto-generated if omitted)' },
        description: { type: 'string' },
        vertical: { type: 'string', enum: ['semiconductor', 'space', 'biotech', 'defense'] },
        website: { type: 'string' },
      },
      required: ['name', 'vertical'],
    },
  },
  {
    name: 'delete_org',
    description: 'Delete an org and ALL its companies + listings. IRREVERSIBLE. Only call this after the user confirms they want to delete.',
    input_schema: {
      type: 'object',
      properties: {
        org_id_or_slug: { type: 'string', description: 'Organization UUID or slug' },
      },
      required: ['org_id_or_slug'],
    },
  },
  {
    name: 'add_company',
    description: 'Add a single company to the directory.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        slug: { type: 'string', description: 'URL slug (auto-generated if omitted)' },
        description: { type: 'string' },
        vertical: { type: 'string', enum: ['semiconductor', 'space', 'biotech', 'defense'] },
        city: { type: 'string' },
        state: { type: 'string' },
        website: { type: 'string' },
        employee_count: { type: 'string', description: 'Range e.g. 51-200' },
        membership_tier: { type: 'string', enum: ['free', 'basic', 'pro', 'enterprise'] },
        org_id: { type: 'string', description: 'Organization UUID to associate with' },
      },
      required: ['name', 'vertical'],
    },
  },
  {
    name: 'bulk_seed_companies',
    description: 'Insert multiple companies at once. Use your knowledge to generate real AZ companies with realistic details.',
    input_schema: {
      type: 'object',
      properties: {
        companies: {
          type: 'array',
          description: 'Array of company objects',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              slug: { type: 'string' },
              description: { type: 'string' },
              vertical: { type: 'string' },
              city: { type: 'string' },
              website: { type: 'string' },
              employee_count: { type: 'string' },
              year_founded: { type: 'integer' },
              phone: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['name', 'vertical'],
          },
        },
        org_id: { type: 'string', description: 'Org UUID to associate all companies with' },
      },
      required: ['companies'],
    },
  },
  {
    name: 'remove_company',
    description: 'Delete a company, all its certifications, and all its listings.',
    input_schema: {
      type: 'object',
      properties: {
        company_id_or_slug: { type: 'string' },
      },
      required: ['company_id_or_slug'],
    },
  },
  {
    name: 'create_listing',
    description: 'Create a job, equipment listing, event, or article.',
    input_schema: {
      type: 'object',
      properties: {
        company_id: { type: 'string' },
        category: { type: 'string', enum: ['jobs', 'equipment', 'events', 'articles'] },
        title: { type: 'string' },
        description: { type: 'string' },
        location: { type: 'string' },
        salary_range: { type: 'string' },
        employment_type: { type: 'string' },
        org_id: { type: 'string' },
      },
      required: ['company_id', 'category', 'title', 'description'],
    },
  },
  {
    name: 'delete_listing',
    description: 'Delete a listing by ID.',
    input_schema: {
      type: 'object',
      properties: { listing_id: { type: 'string' } },
      required: ['listing_id'],
    },
  },
  {
    name: 'get_stats',
    description: 'Get directory stats: total companies, orgs, listings by type, companies by vertical.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_orgs',
    description: 'List all organizations with company counts.',
    input_schema: { type: 'object', properties: {} },
  },
];

const SCOUT_TOOLS = [
  {
    name: 'search_companies',
    description: 'Search for companies by query text, vertical, certification, employee size, or city.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text search against name and description' },
        vertical: { type: 'string', enum: ['semiconductor', 'space', 'biotech', 'defense'] },
        certification: { type: 'string', description: 'Required cert e.g. "ITAR Registered"' },
        employee_range: { type: 'string', description: 'Range e.g. "51-200"' },
        city: { type: 'string' },
        limit: { type: 'integer', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_company',
    description: 'Get full company profile including certifications.',
    input_schema: {
      type: 'object',
      properties: { slug: { type: 'string' } },
      required: ['slug'],
    },
  },
  {
    name: 'get_listings',
    description: 'Get jobs, equipment listings, events, or articles.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['jobs', 'equipment', 'events', 'articles'] },
        vertical: { type: 'string' },
        org_id: { type: 'string' },
        limit: { type: 'integer' },
      },
    },
  },
  {
    name: 'list_orgs',
    description: 'List all organizations with their verticals.',
    input_schema: { type: 'object', properties: {} },
  },
];

// ─── System Prompts ───────────────────────────────────────────────────────────

const ADMIN_SYSTEM = `You are Scout, the directory manager for sourcing.directory. You help Ben manage his industrial supplier directories.

You can:
- Spin up a new directory (org) for any industry group
- Delete a directory and all its data
- Add individual companies or bulk-seed an entire vertical
- Create job posts, equipment listings, events
- Report stats on the current state

When asked to create something, do it immediately -- don't ask for confirmation unless it's a destructive action (delete).
When bulk seeding, use real AZ companies you know. Include realistic details: website, phone, employee count, year founded.
Keep responses short. Confirm what you did, give the URL, move on.`;

const SCOUT_SYSTEM = `You are Scout, the search agent for sourcing.directory -- an industrial supplier directory for semiconductor, space, biotech, and defense companies in Arizona.

Help the user find suppliers, understand what's in the directory, and connect with the right companies.
Search based on their needs, not just keywords. If they say "ITAR certified space companies" -- search for that.
Keep responses short and direct. If you find matches, list them with a one-line description.`;

// ─── Tool Executors ───────────────────────────────────────────────────────────

function makeSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function executeAdminTool(name, args) {
  const sb = getClient(true);
  if (!sb) throw new Error('Admin client unavailable (check SUPABASE_SERVICE_ROLE_KEY)');

  switch (name) {
    case 'create_org': {
      const slug = args.slug || makeSlug(args.name);
      const { data, error } = await sb.from('directory_organizations').insert({
        name: args.name, slug,
        description: args.description || null,
        vertical: args.vertical,
        website: args.website || null,
        status: 'active',
      }).select().single();
      if (error) throw new Error(error.message);
      return { success: true, org: { id: data.id, name: data.name, slug: data.slug }, url: `/sourcing/org/${slug}` };
    }

    case 'delete_org': {
      let orgId = args.org_id_or_slug;
      if (orgId.length < 36) {
        const { data: org } = await sb.from('directory_organizations').select('id').eq('slug', orgId).single();
        if (org) orgId = org.id;
      }
      const { data: orgCompanies } = await sb.from('directory_companies').select('id').eq('organization_id', orgId);
      const companyIds = (orgCompanies || []).map(c => c.id);
      if (companyIds.length > 0) {
        await sb.from('directory_certifications').delete().in('company_id', companyIds);
        await sb.from('directory_listings').delete().in('company_id', companyIds);
        await sb.from('directory_companies').delete().in('id', companyIds);
      }
      await sb.from('directory_listings').delete().eq('org_id', orgId);
      await sb.from('directory_organizations').delete().eq('id', orgId);
      return { success: true, deleted: { companies: companyIds.length } };
    }

    case 'add_company': {
      const slug = args.slug || makeSlug(args.name);
      const { data, error } = await sb.from('directory_companies').insert({
        name: args.name, slug,
        description: args.description || null,
        vertical: args.vertical,
        city: args.city || 'Phoenix',
        state: args.state || 'AZ',
        country: 'US',
        website: args.website || null,
        employee_count: args.employee_count || null,
        membership_tier: args.membership_tier || 'free',
        organization_id: args.org_id || null,
        status: 'active',
      }).select().single();
      if (error) throw new Error(error.message);
      return { success: true, company: { id: data.id, name: data.name }, url: `/sourcing/${slug}` };
    }

    case 'bulk_seed_companies': {
      const rows = args.companies.map(c => ({
        name: c.name,
        slug: c.slug || makeSlug(c.name),
        description: c.description || null,
        vertical: c.vertical || 'semiconductor',
        city: c.city || 'Phoenix',
        state: 'AZ', country: 'US',
        website: c.website || null,
        employee_count: c.employee_count || null,
        year_founded: c.year_founded || null,
        phone: c.phone || null,
        email: c.email || null,
        membership_tier: 'free',
        organization_id: args.org_id || null,
        status: 'active',
      }));
      const { data, error } = await sb.from('directory_companies').insert(rows).select('name');
      if (error) throw new Error(error.message);
      return { success: true, added: data.length, companies: data.map(c => c.name) };
    }

    case 'remove_company': {
      let companyId = args.company_id_or_slug;
      if (companyId.length < 36) {
        const { data: co } = await sb.from('directory_companies').select('id').eq('slug', companyId).single();
        if (co) companyId = co.id;
      }
      await sb.from('directory_certifications').delete().eq('company_id', companyId);
      await sb.from('directory_listings').delete().eq('company_id', companyId);
      await sb.from('directory_companies').delete().eq('id', companyId);
      return { success: true };
    }

    case 'create_listing': {
      const { data, error } = await sb.from('directory_listings').insert({
        company_id: args.company_id,
        category: args.category,
        title: args.title,
        description: args.description,
        location: args.location || null,
        salary_range: args.salary_range || null,
        employment_type: args.employment_type || null,
        org_id: args.org_id || null,
        status: 'active',
      }).select().single();
      if (error) throw new Error(error.message);
      return { success: true, listing: { id: data.id, title: data.title } };
    }

    case 'delete_listing': {
      await sb.from('directory_listings').delete().eq('id', args.listing_id);
      return { success: true };
    }

    case 'get_stats': {
      const [compRes, orgsRes, listingsRes] = await Promise.all([
        sb.from('directory_companies').select('id, vertical, status'),
        sb.from('directory_organizations').select('id'),
        sb.from('directory_listings').select('id, category, status'),
      ]);
      const byVertical = {};
      (compRes.data || []).forEach(c => { byVertical[c.vertical] = (byVertical[c.vertical] || 0) + 1; });
      const byCategory = {};
      (listingsRes.data || []).forEach(l => { byCategory[l.category] = (byCategory[l.category] || 0) + 1; });
      return {
        companies: {
          total: (compRes.data || []).length,
          active: (compRes.data || []).filter(c => c.status === 'active').length,
          by_vertical: byVertical,
        },
        orgs: { total: (orgsRes.data || []).length },
        listings: { total: (listingsRes.data || []).length, by_category: byCategory },
      };
    }

    case 'list_orgs': {
      const { data } = await sb.from('directory_organizations')
        .select('id, name, slug, vertical, directory_companies(id)')
        .order('name');
      return (data || []).map(o => ({
        id: o.id, name: o.name, slug: o.slug, vertical: o.vertical,
        company_count: (o.directory_companies || []).length,
        url: `/sourcing/org/${o.slug}`,
      }));
    }

    default:
      throw new Error(`Unknown admin tool: ${name}`);
  }
}

async function executeScoutTool(name, args) {
  const sb = getClient(false);
  if (!sb) throw new Error('Scout client unavailable');

  switch (name) {
    case 'search_companies': {
      let q = sb.from('directory_companies')
        .select('id, name, slug, description, vertical, city, state, website, employee_count, directory_certifications(cert_name)')
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .limit(args.limit || 20);
      if (args.vertical) q = q.eq('vertical', args.vertical);
      if (args.city) q = q.ilike('city', `%${args.city}%`);
      if (args.employee_range) q = q.eq('employee_count', args.employee_range);
      if (args.query) q = q.or(`name.ilike.%${args.query}%,description.ilike.%${args.query}%`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      let results = data || [];
      if (args.certification) {
        const certLower = args.certification.toLowerCase();
        results = results.filter(c =>
          (c.directory_certifications || []).some(cert =>
            cert.cert_name.toLowerCase().includes(certLower)
          )
        );
      }
      return results.map(c => ({
        name: c.name, slug: c.slug, description: c.description,
        vertical: c.vertical, city: c.city, website: c.website,
        certifications: (c.directory_certifications || []).map(cert => cert.cert_name),
        url: `/sourcing/${c.slug}`,
      }));
    }

    case 'get_company': {
      const { data, error } = await sb.from('directory_companies')
        .select('*, directory_certifications(*)')
        .eq('slug', args.slug)
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case 'get_listings': {
      let q = sb.from('directory_listings')
        .select('id, title, category, description, location, status, directory_companies(name, slug)')
        .eq('status', 'active')
        .limit(args.limit || 20);
      if (args.category) q = q.eq('category', args.category);
      if (args.org_id) q = q.eq('org_id', args.org_id);
      const { data } = await q;
      return data || [];
    }

    case 'list_orgs': {
      const { data } = await sb.from('directory_organizations')
        .select('id, name, slug, vertical')
        .order('name');
      return data || [];
    }

    default:
      throw new Error(`Unknown scout tool: ${name}`);
  }
}

// ─── SSE Helper ───────────────────────────────────────────────────────────────

function sse(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { message, mode = 'scout' } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });

  const isAdmin = mode === 'admin';
  const tools = isAdmin ? ADMIN_TOOLS : SCOUT_TOOLS;
  const systemPrompt = isAdmin ? ADMIN_SYSTEM : SCOUT_SYSTEM;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (!ANTHROPIC_API_KEY) {
    sse(res, { type: 'text', text: 'Scout is not yet configured (ANTHROPIC_API_KEY missing).' });
    sse(res, { type: 'done' });
    return res.end();
  }

  const messages = [{ role: 'user', content: message }];
  const MAX_LOOPS = 5;

  try {
    for (let loop = 0; loop < MAX_LOOPS; loop++) {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: systemPrompt,
          tools,
          messages,
          stream: true,
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        sse(res, { type: 'error', error: errText });
        break;
      }

      // Stream + collect content blocks
      const reader = anthropicRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const contentBlocks = [];
      let currentBlock = null;
      let stopReason = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const event = JSON.parse(raw);
            switch (event.type) {
              case 'content_block_start':
                currentBlock = { ...event.content_block, text: '', input_json: '' };
                break;
              case 'content_block_delta':
                if (!currentBlock) break;
                if (event.delta.type === 'text_delta') {
                  currentBlock.text += event.delta.text;
                  sse(res, { type: 'text', text: event.delta.text });
                } else if (event.delta.type === 'input_json_delta') {
                  currentBlock.input_json += event.delta.partial_json;
                }
                break;
              case 'content_block_stop':
                if (currentBlock) {
                  if (currentBlock.type === 'tool_use') {
                    try { currentBlock.input = JSON.parse(currentBlock.input_json || '{}'); }
                    catch { currentBlock.input = {}; }
                  }
                  contentBlocks.push(currentBlock);
                  currentBlock = null;
                }
                break;
              case 'message_delta':
                if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
                break;
            }
          } catch { /* skip malformed */ }
        }
      }

      const toolUseBlocks = contentBlocks.filter(b => b.type === 'tool_use');
      if (toolUseBlocks.length === 0 || stopReason === 'end_turn') break;

      // Add assistant message, execute tools, add results
      messages.push({
        role: 'assistant',
        content: contentBlocks.map(b =>
          b.type === 'tool_use'
            ? { type: 'tool_use', id: b.id, name: b.name, input: b.input }
            : { type: 'text', text: b.text }
        ),
      });

      const toolResults = [];
      for (const block of toolUseBlocks) {
        sse(res, { type: 'tool_call', name: block.name, args: block.input });
        try {
          const result = isAdmin
            ? await executeAdminTool(block.name, block.input)
            : await executeScoutTool(block.name, block.input);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
        } catch (err) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: err.message }), is_error: true });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    }

    sse(res, { type: 'done' });
    res.end();
  } catch (err) {
    console.error('Scout agent error:', err);
    try {
      sse(res, { type: 'error', error: err.message });
      sse(res, { type: 'done' });
      res.end();
    } catch { /* already closed */ }
  }
}

export const config = { maxDuration: 60 };
