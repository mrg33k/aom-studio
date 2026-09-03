// /api/dashboard/campaigns
// The Email > Campaign tool's main endpoint:
//   GET    ?world=ben                - list campaigns (health light + stats per row)
//   GET    ?world=ben&id=<id>        - full detail: pipeline counts, TODAY payload, stats
//   POST   {world, name, ...}        - create from the wizard (csv rows or dataset filter)
//   PATCH  {world, id, ...fields}    - edit settings (name, template, cap, goal)
// Sending/health mutation lives in the engine and campaign-actions.js; this
// file never sends mail.
//
// corner:retire-supabase (2026-09-03): campaigns live on Convex
// (campaigns:list / get / create / update / addContacts / recordEvent). The
// old columns that Convex does not carry as fields (template_*, daily_cap,
// send_hour_local, autopilot, goal_*, next_run_at, health_*, sending
// account) live in the campaign's `settings` blob and are spread back onto
// each row so the UI reads the same keys it always did.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { requestedTenantFromCompat, sendTenantContextError } from '../_lib/tenantContext.js';
import { csvToContacts, datasetToContacts, EMAIL_RE } from '../_lib/csvAudience.js';
import { buildCampaignSetupTruth } from '../_lib/campaignTruth.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

const STAGES = ['to_contact', 'contacted', 'replied', 'call_set', 'won', 'lost', 'bounced', 'noise'];
const MAX_AUDIENCE_ROWS = 25000;
const DATASET_PATH = '/arsenal-municipality-data.json';

const STAGE_ALIAS = { queued: 'to_contact', sent: 'contacted', opened: 'contacted', unsubscribed: 'noise' };
function pipelineStage(stage) {
  return STAGE_ALIAS[stage] || stage;
}

function shapeCampaign(c, world) {
  const s = (c.settings && typeof c.settings === 'object') ? c.settings : {};
  return {
    ...s,
    id: c._id,
    world,
    name: c.name,
    slug: s.slug || null,
    status: c.status === 'running' ? 'active' : c.status,
    template_subject: c.subject ?? s.template_subject ?? null,
    template_body: c.body ?? s.template_body ?? null,
    sending_email: c.fromEmail ?? s.sending_email ?? null,
    created_at: new Date(c.createdAt).toISOString(),
    updated_at: new Date(c.updatedAt).toISOString(),
  };
}

function shapeContact(c) {
  return {
    id: c._id, name: c.name || null, email: c.email || null, merge_fields: c.fields || {}, stage: pipelineStage(c.stage),
    last_reply_at: c.fields?.last_reply_at || null, reply_thread_id: c.fields?.reply_thread_id || null,
    follow_up_due_at: c.fields?.follow_up_due_at || null,
  };
}

function shapeBatch(batch) {
  if (!batch) return null;
  return {
    id: batch._id, status: batch.status, contact_count: batch.size,
    batch_date: batch.scheduledFor ? new Date(batch.scheduledFor).toISOString().slice(0, 10) : null,
    created_at: new Date(batch.createdAt).toISOString(),
  };
}

async function contactsOf(campaignId) {
  const page = await convexQuery('campaigns:contacts', { id: campaignId, limit: 100000 });
  return page?.rows || [];
}

function pipelineCounts(contacts) {
  const out = {};
  for (const s of STAGES) out[s] = 0;
  for (const c of contacts) {
    const stage = pipelineStage(c.stage);
    out[stage] = (out[stage] || 0) + 1;
  }
  return out;
}

function statsFor(pipeline, sent) {
  return {
    sent,
    // human replies only; auto-replies sit in the 'noise' stage and don't count
    replies: (pipeline.replied || 0) + (pipeline.call_set || 0) + (pipeline.won || 0),
    calls: (pipeline.call_set || 0) + (pipeline.won || 0),
    won: pipeline.won || 0,
  };
}

async function sentCount(campaignId) {
  const events = await convexQuery('campaigns:events', { id: campaignId, limit: 100000 }).catch(() => []);
  return (Array.isArray(events) ? events : []).filter((e) => e.kind === 'sent').length;
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

  let world;
  let tenantContext;
  try {
    const requested = requestedTenantFromCompat({ query: req.query || {}, body: req.body || {} });
    const auth = await verifyTenant(requested, req);
    world = auth.tenant;
    tenantContext = { ok: true, tenantId: world, canonicalSlug: world, aliases: [world], userId: auth.userId, isAdmin: !!auth.isAdmin };
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ ok: false, error: err.message });
    return sendTenantContextError(res, err);
  }

  try {
    const owner = await convexQuery('worlds:getBySlug', { slug: world }).catch(() => null);

    if (req.method === 'GET' && req.query.id) {
      // ---- detail ------------------------------------------------------
      const id = String(req.query.id);
      const c = await convexQuery('campaigns:get', { id }).catch(() => null);
      if (!c || !owner || String(owner._id) !== String(c.worldId)) return res.status(404).json({ error: 'campaign not found' });
      const campaign = shapeCampaign(c, world);
      const campaignSetup = buildCampaignSetupTruth({ tenantContext, campaigns: [campaign] });

      const contacts = await contactsOf(c._id);
      const pipeline = pipelineCounts(contacts);
      const stats = statsFor(pipeline, await sentCount(c._id));

      const threeDaysAgo = Date.now() - 3 * 864e5;
      const nowIso = new Date().toISOString();
      const newReplies = contacts
        .filter((x) => ['replied', 'call_set', 'won'].includes(pipelineStage(x.stage)) && x.fields?.last_reply_at && Date.parse(x.fields.last_reply_at) >= threeDaysAgo)
        .sort((a, b) => String(b.fields.last_reply_at).localeCompare(String(a.fields.last_reply_at)))
        .slice(0, 10).map(shapeContact);
      const followUps = contacts
        .filter((x) => ['contacted', 'replied', 'call_set'].includes(pipelineStage(x.stage)) && x.fields?.follow_up_due_at && x.fields.follow_up_due_at <= nowIso)
        .sort((a, b) => String(a.fields.follow_up_due_at).localeCompare(String(b.fields.follow_up_due_at)))
        .slice(0, 10).map(shapeContact);
      const flaggedCount = contacts.filter((x) => x.fields?.hygiene_flag && pipelineStage(x.stage) === 'to_contact').length;

      return res.status(200).json({
        ok: true,
        campaign_setup: campaignSetup,
        tenant_id: world,
        campaign,
        pipeline,
        stats,
        today: {
          newReplies,
          batch: shapeBatch((Array.isArray(c.batches) ? c.batches : [])[0] || null),
          followUpsDue: followUps,
          flaggedCount,
        },
      });
    }

    if (req.method === 'GET') {
      // ---- list --------------------------------------------------------
      const rows = await convexQuery('campaigns:list', { worldId: world });
      const campaigns = (Array.isArray(rows) ? rows : []).map((c) => shapeCampaign(c, world))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      const campaignSetup = buildCampaignSetupTruth({ tenantContext, campaigns, misfiledCampaigns: [] });
      const withStats = await Promise.all(
        campaigns.map(async (c) => {
          const contacts = await contactsOf(c.id);
          return { ...c, stats: statsFor(pipelineCounts(contacts), await sentCount(c.id)) };
        })
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

      const existing = (await convexQuery('campaigns:list', { worldId: world }).catch(() => [])) || [];
      const takenSlugs = new Set(existing.map((c) => c.settings?.slug).filter(Boolean));
      const slugBase = slugify(name) || 'campaign';
      let slug = slugBase;
      for (let i = 2; i < 20 && takenSlugs.has(slug); i++) slug = `${slugBase}-${i}`;

      const sendHour = Number.isFinite(+b.send_hour_local) ? Math.min(Math.max(+b.send_hour_local, 0), 23) : 7;
      const next = new Date();
      next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours((sendHour + 7) % 24, 0, 0, 0); // America/Phoenix = UTC-7, no DST

      const settings = {
        slug,
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
      const campaignId = await convexMutation('campaigns:create', {
        worldId: world, name, subject, body, fromEmail: b.sending_email, settings,
      });
      if (b.launch !== false) await convexMutation('campaigns:update', { id: campaignId, patch: { status: 'running' } });

      // contacts from the materialized audience. Convex dedupes by email; rows
      // with no email but a place key are keyed on the place instead.
      let inserted = 0;
      let skipped = 0;
      if (contactsIn.length) {
        const seen = new Set();
        const rows = [];
        for (const c of contactsIn) {
          const email = (c.email || '').trim().toLowerCase();
          if (email && (!EMAIL_RE.test(email) || seen.has(email))) { skipped++; continue; }
          if (!email && !c.place_key) { skipped++; continue; }
          if (email) seen.add(email);
          rows.push({
            email: email || `${String(c.place_key).replace(/[^a-z0-9._-]/gi, '-').toLowerCase()}@no-email.local`,
            name: (c.name || '').trim() || undefined,
            fields: { ...(c.merge_fields && typeof c.merge_fields === 'object' ? c.merge_fields : {}), ...(c.place_key ? { place_key: c.place_key } : {}), source: audience.source || 'wizard' },
          });
        }
        for (let i = 0; i < rows.length; i += 1000) {
          const result = await convexMutation('campaigns:addContacts', { id: campaignId, contacts: rows.slice(i, i + 1000) });
          inserted += result?.added || 0;
          skipped += result?.skipped || 0;
        }
        if (csvSkipped) skipped += csvSkipped.noEmail + csvSkipped.badEmail + csvSkipped.dupes;
      }

      await convexMutation('campaigns:recordEvent', {
        campaignId,
        kind: 'import',
        payload: {
          summary: `Campaign created: ${inserted} contacts loaded${skipped ? `, ${skipped} rows skipped` : ''}`,
          details: { inserted, skipped, source: audience.source || 'wizard' },
        },
      });

      const created = await convexQuery('campaigns:get', { id: campaignId });
      return res.status(200).json({ ok: true, campaign: shapeCampaign(created, world), inserted, skipped });
    }

    if (req.method === 'PATCH') {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: 'id required' });
      const allowed = [
        'name', 'goal_target', 'goal_unit', 'template_subject', 'template_body',
        'merge_fields', 'daily_cap', 'send_hour_local',
      ];
      const c = await convexQuery('campaigns:get', { id: String(b.id) }).catch(() => null);
      if (!c || !owner || String(owner._id) !== String(c.worldId)) return res.status(404).json({ error: 'campaign not found' });
      const settingsPatch = {};
      const patch = {};
      for (const k of allowed) {
        if (!(k in b)) continue;
        if (k === 'name') patch.name = String(b.name || '').trim() || c.name;
        else if (k === 'template_subject') { patch.subject = b[k]; settingsPatch[k] = b[k]; }
        else if (k === 'template_body') { patch.body = b[k]; settingsPatch[k] = b[k]; }
        else settingsPatch[k] = b[k];
      }
      if (!Object.keys(patch).length && !Object.keys(settingsPatch).length) return res.status(400).json({ error: 'nothing to update' });
      if (Object.keys(settingsPatch).length) patch.settings = { ...((c.settings && typeof c.settings === 'object') ? c.settings : {}), ...settingsPatch };
      await convexMutation('campaigns:update', { id: c._id, patch });
      const updated = await convexQuery('campaigns:get', { id: c._id });
      return res.status(200).json({ ok: true, campaign: shapeCampaign(updated, world) });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
}
