// /api/dashboard/campaigns — corner:campaign-tool R3.
// The Email > Campaign tool's main endpoint:
//   GET    ?world=ben                — list campaigns (health light + stats per row)
//   GET    ?world=ben&id=<uuid>      — full detail: pipeline counts, TODAY payload, stats
//   POST   {world, name, ...}        — create from the wizard (csv rows or dataset filter)
//   PATCH  {world, id, ...fields}    — edit settings (name, template, cap, goal)
// Sending/health mutation lives in the engine (scripts/campaign-send.py) and
// /api/dashboard/campaign-actions.js — this file never sends mail.

import { resolveTenantContext, sendTenantContextError } from '../_lib/tenantContext.js';
import { csvToContacts, datasetToContacts, EMAIL_RE } from '../_lib/csvAudience.js';
import { buildCampaignSetupTruth } from '../_lib/campaignTruth.js';
import { listConnectionsForUser } from '../_lib/mailAccess.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STAGES = ['to_contact', 'contacted', 'replied', 'call_set', 'won', 'lost', 'bounced', 'noise'];
const MAX_AUDIENCE_ROWS = 25000;
const DATASET_PATH = '/arsenal-municipality-data.json';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
}

function restIn(values) {
  return (values || [])
    .map(value => encodeURIComponent(String(value)))
    .join(',');
}

async function scopedCampaignConnectionIds(tenantContext) {
  if (!tenantContext?.userId) return [];
  const aliasSet = new Set(tenantContext.aliases || []);
  try {
    const connections = await listConnectionsForUser(tenantContext.userId);
    return connections
      .filter(connection => connection.workspace_id && aliasSet.has(String(connection.workspace_id).trim().toLowerCase()))
      .map(connection => connection.id)
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function listMisfiledCampaigns(tenantContext, limit = 10) {
  const connectionIds = await scopedCampaignConnectionIds(tenantContext);
  if (!connectionIds.length || !(tenantContext?.aliases || []).length) return [];
  const r = await sb(
    `campaigns?sending_connection_id=in.(${restIn(connectionIds)})` +
      `&world=not.in.(${restIn(tenantContext.aliases)})` +
      `&select=id,name,slug,status,world,created_at,updated_at&order=created_at.desc&limit=${limit}`,
  );
  if (!r.ok) return [];
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

async function countWhere(table, filter) {
  const r = await sb(`${table}?${filter}&select=id&limit=1`, {
    method: 'HEAD',
    prefer: 'count=exact',
  });
  const range = r.headers.get('content-range') || '';
  const total = parseInt(range.split('/')[1], 10);
  return Number.isFinite(total) ? total : 0;
}

async function pipelineCounts(campaignId) {
  const out = {};
  await Promise.all(
    STAGES.map(async (s) => {
      out[s] = await countWhere(
        'campaign_contacts',
        `campaign_id=eq.${campaignId}&stage=eq.${s}`
      );
    })
  );
  return out;
}

async function statsFor(campaignId, pipeline) {
  const sent = await countWhere('campaign_sends', `campaign_id=eq.${campaignId}`);
  const p = pipeline || (await pipelineCounts(campaignId));
  return {
    sent,
    // human replies only — auto-replies sit in the 'noise' stage and don't count
    replies: (p.replied || 0) + (p.call_set || 0) + (p.won || 0),
    calls: (p.call_set || 0) + (p.won || 0),
    won: p.won || 0,
  };
}

function slugify(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  let tenantContext;
  let world;
  try {
    tenantContext = await resolveTenantContext(req);
    world = tenantContext.tenantId;
  } catch (err) {
    return sendTenantContextError(res, err);
  }
  const campaignWorlds = tenantContext.aliases?.length ? tenantContext.aliases : [world];
  const campaignWorldFilter = `world=in.(${restIn(campaignWorlds)})`;

  try {
    if (req.method === 'GET' && req.query.id) {
      // ---- detail ------------------------------------------------------
      const id = String(req.query.id);
      const r = await sb(`campaigns?id=eq.${id}&${campaignWorldFilter}&select=*`);
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows = await r.json();
      if (!rows.length) return res.status(404).json({ error: 'campaign not found' });
      const campaign = rows[0];
      const campaignSetup = buildCampaignSetupTruth({ tenantContext, campaigns: rows });

      const pipeline = await pipelineCounts(id);
      const stats = await statsFor(id, pipeline);

      const threeDaysAgo = new Date(Date.now() - 3 * 864e5).toISOString();
      const [repliesR, batchR, followR, flaggedCount] = await Promise.all([
        sb(
          `campaign_contacts?campaign_id=eq.${id}&last_reply_at=gte.${encodeURIComponent(
            threeDaysAgo
          )}&stage=in.(replied,call_set,won)&select=id,name,email,merge_fields,stage,last_reply_at,reply_thread_id&order=last_reply_at.desc&limit=10`
        ),
        sb(
          `campaign_batches?campaign_id=eq.${id}&select=*&order=created_at.desc&limit=1`
        ),
        sb(
          `campaign_contacts?campaign_id=eq.${id}&follow_up_due_at=lte.${encodeURIComponent(
            new Date().toISOString()
          )}&stage=in.(contacted,replied,call_set)&select=id,name,email,merge_fields,stage,follow_up_due_at&order=follow_up_due_at.asc&limit=10`
        ),
        countWhere('campaign_contacts', `campaign_id=eq.${id}&hygiene_flag=not.is.null&stage=eq.to_contact`),
      ]);
      const newReplies = repliesR.ok ? await repliesR.json() : [];
      const batches = batchR.ok ? await batchR.json() : [];
      const followUps = followR.ok ? await followR.json() : [];

      return res.status(200).json({
        ok: true,
        campaign_setup: campaignSetup,
        tenant_id: world,
        campaign,
        pipeline,
        stats,
        today: {
          newReplies,
          batch: batches[0] || null,
          followUpsDue: followUps,
          flaggedCount,
        },
      });
    }

    if (req.method === 'GET') {
      // ---- list --------------------------------------------------------
      const r = await sb(
        `campaigns?${campaignWorldFilter}&select=*&order=created_at.asc`
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const campaigns = await r.json();
      const misfiledCampaigns = campaigns.length ? [] : await listMisfiledCampaigns(tenantContext);
      const campaignSetup = buildCampaignSetupTruth({ tenantContext, campaigns, misfiledCampaigns });
      const withStats = await Promise.all(
        campaigns.map(async (c) => ({ ...c, stats: await statsFor(c.id) }))
      );
      return res.status(200).json({
        ok: true,
        tenant_id: world,
        campaign_setup: campaignSetup,
        campaigns: withStats,
      });
    }

    if (req.method === 'POST') {
      // ---- create (wizard) ----------------------------------------------
      const b = req.body || {};
      const name = (b.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name required' });
      const subject = (b.template_subject || '').trim();
      const body = (b.template_body || '').trim();
      if (!subject || !body) return res.status(400).json({ error: 'template subject and body required' });
      if (!b.sending_connection_id || !b.sending_email) {
        return res.status(400).json({ error: 'sending account required' });
      }
      const dailyCap = Math.min(Math.max(parseInt(b.daily_cap, 10) || 50, 1), 500);
      const audience = b.audience || {};
      let contactsIn = Array.isArray(audience.contacts) ? audience.contacts : [];
      let csvSkipped = null;
      if (audience.source === 'csv_upload' && audience.csv) {
        const parsed = csvToContacts(String(audience.csv), audience.mapping || {});
        contactsIn = parsed.contacts;
        csvSkipped = parsed.skipped;
        if (!contactsIn.length) return res.status(400).json({ error: 'csv audience has no valid rows' });
      } else if (audience.source === 'dataset') {
        if (audience.dataset !== 'us-municipalities') {
          return res.status(400).json({ error: 'unknown dataset' });
        }
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const dr = await fetch(`${proto}://${host}${DATASET_PATH}`);
        if (!dr.ok) return res.status(502).json({ error: 'dataset fetch failed' });
        contactsIn = datasetToContacts((await dr.json()).places || [], audience.filters || {}).contacts;
        if (!contactsIn.length) return res.status(400).json({ error: 'no places match those filters' });
      }
      if (audience.source === 'csv_upload' && !contactsIn.length) {
        return res.status(400).json({ error: 'csv audience has no rows' });
      }
      if (contactsIn.length > MAX_AUDIENCE_ROWS) {
        return res.status(400).json({ error: `audience too large (max ${MAX_AUDIENCE_ROWS})` });
      }

      const slugBase = slugify(name) || 'campaign';
      let slug = slugBase;
      for (let i = 2; i < 20; i++) {
        const dup = await countWhere(
          'campaigns',
          `world=eq.${encodeURIComponent(world)}&slug=eq.${slug}`
        );
        if (!dup) break;
        slug = `${slugBase}-${i}`;
      }

      const sendHour = Number.isFinite(+b.send_hour_local) ? Math.min(Math.max(+b.send_hour_local, 0), 23) : 7;
      const next = new Date();
      next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours((sendHour + 7) % 24, 0, 0, 0); // America/Phoenix = UTC-7, no DST

      const row = {
        world,
        slug,
        name,
        status: b.launch === false ? 'draft' : 'active',
        goal_target: parseInt(b.goal_target, 10) || null,
        goal_unit: (b.goal_unit || '').trim() || null,
        template_subject: subject,
        template_body: body,
        merge_fields: Array.isArray(b.merge_fields) ? b.merge_fields : ['first_name', 'city', 'state'],
        audience_source: audience.source === 'csv_upload' ? 'csv_upload' : 'dataset',
        audience_meta: audience.meta || {},
        sending_connection_id: b.sending_connection_id,
        sending_email: b.sending_email,
        daily_cap: dailyCap,
        send_hour_local: sendHour,
        autopilot: !!b.autopilot,
        next_run_at: b.launch === false ? null : next.toISOString(),
      };
      const cr = await sb('campaigns', { method: 'POST', body: JSON.stringify(row) });
      if (!cr.ok) return res.status(cr.status).json({ error: await cr.text() });
      const campaign = (await cr.json())[0];

      // contacts from the materialized audience
      let inserted = 0;
      let skipped = 0;
      if (contactsIn.length) {
        const seen = new Set();
        const withPlace = [];
        const byEmail = [];
        for (const c of contactsIn) {
          const email = (c.email || '').trim().toLowerCase();
          if (email && (!EMAIL_RE.test(email) || seen.has(email))) {
            skipped++;
            continue;
          }
          if (email) seen.add(email);
          const row = {
            campaign_id: campaign.id,
            world,
            email: email || null,
            name: (c.name || '').trim() || null,
            place_key: c.place_key || null,
            merge_fields: c.merge_fields && typeof c.merge_fields === 'object' ? c.merge_fields : {},
            stage: 'to_contact',
            metadata: { source: audience.source || 'wizard' },
          };
          (c.place_key ? withPlace : byEmail).push(row);
        }
        const insert = async (rows, conflict) => {
          for (let i = 0; i < rows.length; i += 1000) {
            const ir = await sb(`campaign_contacts?on_conflict=${conflict}`, {
              method: 'POST',
              prefer: 'resolution=ignore-duplicates,return=minimal',
              body: JSON.stringify(rows.slice(i, i + 1000)),
            });
            if (!ir.ok) throw new Error(await ir.text());
            inserted += rows.slice(i, i + 1000).length;
          }
        };
        await insert(withPlace, 'campaign_id,place_key');
        await insert(byEmail, 'campaign_id,email');
        if (csvSkipped) skipped += csvSkipped.noEmail + csvSkipped.badEmail + csvSkipped.dupes;
      }

      await sb('campaign_events', {
        method: 'POST',
        prefer: 'return=minimal',
        body: JSON.stringify({
          campaign_id: campaign.id,
          world,
          kind: 'import',
          summary: `Campaign created: ${inserted} contacts loaded${skipped ? `, ${skipped} rows skipped` : ''}`,
          details: { inserted, skipped, source: audience.source || 'wizard' },
        }),
      });

      return res.status(200).json({ ok: true, campaign, inserted, skipped });
    }

    if (req.method === 'PATCH') {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: 'id required' });
      const allowed = [
        'name', 'goal_target', 'goal_unit', 'template_subject', 'template_body',
        'merge_fields', 'daily_cap', 'send_hour_local',
      ];
      const patch = {};
      for (const k of allowed) if (k in b) patch[k] = b[k];
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing to update' });
      patch.updated_at = new Date().toISOString();
      const r = await sb(
        `campaigns?id=eq.${b.id}&world=eq.${encodeURIComponent(world)}`,
        { method: 'PATCH', body: JSON.stringify(patch) }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows = await r.json();
      if (!rows.length) return res.status(404).json({ error: 'campaign not found' });
      return res.status(200).json({ ok: true, campaign: rows[0] });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
}
