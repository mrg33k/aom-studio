// /api/dashboard/campaigns — corner:campaign-tool R3.
// The Email > Campaign tool's main endpoint:
//   GET    ?world=ben                — list campaigns (health light + stats per row)
//   GET    ?world=ben&id=<uuid>      — full detail: pipeline counts, TODAY payload, stats
//   POST   {world, name, ...}        — create from the wizard (csv rows or dataset filter)
//   PATCH  {world, id, ...fields}    — edit settings (name, template, cap, goal)
// Sending/health mutation lives in the engine (scripts/campaign-send.py) and
// /api/dashboard/campaign-actions.js — this file never sends mail.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STAGES = ['to_contact', 'contacted', 'replied', 'call_set', 'won', 'lost', 'bounced', 'noise'];
const MAX_AUDIENCE_ROWS = 25000;

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
  const replies = await countWhere(
    'campaign_contacts',
    `campaign_id=eq.${campaignId}&last_reply_at=not.is.null`
  );
  const p = pipeline || (await pipelineCounts(campaignId));
  return {
    sent,
    replies,
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const requested =
    (typeof req.query.world === 'string' && req.query.world.trim()) ||
    (req.body && typeof req.body.world === 'string' && req.body.world.trim()) ||
    'aom';
  let world;
  try {
    ({ tenant: world } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  try {
    if (req.method === 'GET' && req.query.id) {
      // ---- detail ------------------------------------------------------
      const id = String(req.query.id);
      const r = await sb(`campaigns?id=eq.${id}&world=eq.${encodeURIComponent(world)}&select=*`);
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows = await r.json();
      if (!rows.length) return res.status(404).json({ error: 'campaign not found' });
      const campaign = rows[0];

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
        `campaigns?world=eq.${encodeURIComponent(world)}&select=*&order=created_at.asc`
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const campaigns = await r.json();
      const withStats = await Promise.all(
        campaigns.map(async (c) => ({ ...c, stats: await statsFor(c.id) }))
      );
      return res.status(200).json({ ok: true, campaigns: withStats });
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
      const contactsIn = Array.isArray(audience.contacts) ? audience.contacts : [];
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

      // contacts from validated wizard rows
      let inserted = 0;
      let skipped = 0;
      if (contactsIn.length) {
        const seen = new Set();
        const rows = [];
        for (const c of contactsIn) {
          const email = (c.email || '').trim().toLowerCase();
          if (email && (!EMAIL_RE.test(email) || seen.has(email))) {
            skipped++;
            continue;
          }
          if (email) seen.add(email);
          rows.push({
            campaign_id: campaign.id,
            world,
            email: email || null,
            name: (c.name || '').trim() || null,
            merge_fields: c.merge_fields && typeof c.merge_fields === 'object' ? c.merge_fields : {},
            stage: 'to_contact',
            metadata: { source: audience.source || 'wizard' },
          });
        }
        for (let i = 0; i < rows.length; i += 1000) {
          const ir = await sb('campaign_contacts?on_conflict=campaign_id,email', {
            method: 'POST',
            prefer: 'resolution=ignore-duplicates,return=minimal',
            body: JSON.stringify(rows.slice(i, i + 1000)),
          });
          if (!ir.ok) return res.status(ir.status).json({ error: await ir.text() });
          inserted += rows.slice(i, i + 1000).length;
        }
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
