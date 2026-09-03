// /api/dashboard/campaign-contacts
// Pipeline lists + contact detail. Big audiences are always paginated; the UI
// never loads the whole table.
//   GET   ?world=&id=&stage=contacted&limit=50&offset=0&q=springfield
//   GET   ?world=&id=&contact=<id>          - single contact + touch history
//   PATCH {world, id, contact_id, notes?, follow_up_due_at?}
// Stage moves go through campaign-actions (op=set_stage) so they're logged.
//
// corner:retire-supabase (2026-09-03): contacts come from campaigns:contacts
// on Convex. Notes and follow-up dates live in keyed state per contact
// (kind campaign_contact_notes), merged into each row on read.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { requestedTenantFromCompat, sendTenantContextError } from '../_lib/tenantContext.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

const STAGES = new Set(['to_contact', 'contacted', 'replied', 'call_set', 'won', 'lost', 'bounced', 'noise']);

// campaigns:addContacts inserts with stage "queued"; the tool speaks in the
// old pipeline words.
const STAGE_ALIAS = { queued: 'to_contact', sent: 'contacted', opened: 'contacted', unsubscribed: 'noise' };
function pipelineStage(stage) {
  return STAGE_ALIAS[stage] || stage;
}

async function notesFor(contactId) {
  const row = await convexQuery('state:get', { kind: 'campaign_contact_notes', scopeId: String(contactId) }).catch(() => null);
  return (row && row.value && typeof row.value === 'object') ? row.value : {};
}

function shapeContact(c, notes = {}) {
  return {
    id: c._id,
    campaign_id: c.campaignId,
    name: c.name || null,
    email: c.email || null,
    stage: pipelineStage(c.stage),
    merge_fields: c.fields || {},
    hygiene_flag: c.fields?.hygiene_flag || null,
    last_contacted_at: c.fields?.last_contacted_at || null,
    last_reply_at: c.fields?.last_reply_at || null,
    reply_thread_id: c.fields?.reply_thread_id || null,
    follow_up_due_at: notes.follow_up_due_at || null,
    notes: notes.notes || null,
    created_at: new Date(c.createdAt).toISOString(),
    updated_at: new Date(c.updatedAt).toISOString(),
  };
}

async function ownedCampaign(id, world) {
  const campaign = await convexQuery('campaigns:get', { id }).catch(() => null);
  if (!campaign) return null;
  const owner = await convexQuery('worlds:getBySlug', { slug: world }).catch(() => null);
  if (!owner || String(owner._id) !== String(campaign.worldId)) return null;
  return campaign;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let world;
  try {
    const requested = requestedTenantFromCompat({ query: req.query || {}, body: req.body || {} });
    ({ tenant: world } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ ok: false, error: err.message });
    return sendTenantContextError(res, err);
  }

  const id = String(req.query.id || (req.body && req.body.id) || '');
  if (!id) return res.status(400).json({ error: 'id (campaign) required' });

  try {
    const campaign = await ownedCampaign(id, world);
    if (!campaign) return res.status(404).json({ error: 'campaign not found' });

    if (req.method === 'GET' && req.query.contact) {
      const contactId = String(req.query.contact);
      const all = await convexQuery('campaigns:contacts', { id: campaign._id, limit: 100000 });
      const c = (all?.rows || []).find((row) => String(row._id) === contactId);
      if (!c) return res.status(404).json({ error: 'contact not found' });
      const [events, notes] = await Promise.all([
        convexQuery('campaigns:events', { id: campaign._id, limit: 1000 }).catch(() => []),
        notesFor(c._id),
      ]);
      const mine = (Array.isArray(events) ? events : []).filter((e) => String(e.contactId || '') === contactId);
      const touches = mine.filter((e) => e.kind !== 'sent').slice(0, 50).map((e) => ({
        id: e._id, kind: e.kind, summary: e.payload?.summary || e.kind, details: e.payload?.details || {}, created_at: new Date(e.createdAt).toISOString(),
      }));
      const sends = mine.filter((e) => e.kind === 'sent').map((e) => ({
        sent_at: new Date(e.createdAt).toISOString(), thread_id: e.payload?.thread_id || null, message_id: e.payload?.message_id || null,
      }));
      return res.status(200).json({ ok: true, tenant_id: world, contact: shapeContact(c, notes), events: touches, sends });
    }

    if (req.method === 'GET') {
      const stage = String(req.query.stage || '');
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
      const q = String(req.query.q || '').trim();

      // Read the whole campaign's contacts once; stage aliases mean a Convex
      // stage filter would miss "queued" rows a caller asks for as to_contact.
      const all = await convexQuery('campaigns:contacts', { id: campaign._id, limit: 100000, ...(q ? { q } : {}) });
      let rows = (all?.rows || []);
      if (stage && STAGES.has(stage)) rows = rows.filter((c) => pipelineStage(c.stage) === stage);
      if (req.query.flagged === '1') rows = rows.filter((c) => c.fields?.hygiene_flag);
      if (stage === 'to_contact') {
        // emailable first, then biggest population
        rows.sort((a, b) => (b.email ? 1 : 0) - (a.email ? 1 : 0) || (Number(b.fields?.population) || 0) - (Number(a.fields?.population) || 0));
      }
      const page = rows.slice(offset, offset + limit);
      const contacts = await Promise.all(page.map(async (c) => shapeContact(c, await notesFor(c._id))));
      return res.status(200).json({
        ok: true,
        tenant_id: world,
        contacts,
        total: rows.length,
        hasMore: offset + contacts.length < rows.length,
      });
    }

    if (req.method === 'PATCH') {
      const b = req.body || {};
      if (!b.contact_id) return res.status(400).json({ error: 'contact_id required' });
      if (!('notes' in b) && !('follow_up_due_at' in b)) return res.status(400).json({ error: 'nothing to update' });
      const all = await convexQuery('campaigns:contacts', { id: campaign._id, limit: 100000 });
      const c = (all?.rows || []).find((row) => String(row._id) === String(b.contact_id));
      if (!c) return res.status(404).json({ error: 'contact not found' });
      const value = { ...(await notesFor(c._id)) };
      if ('notes' in b) value.notes = b.notes || null;
      if ('follow_up_due_at' in b) value.follow_up_due_at = b.follow_up_due_at || null;
      await convexMutation('state:put', { kind: 'campaign_contact_notes', scopeId: String(c._id), value, updatedBy: 'campaign-contacts' });
      return res.status(200).json({ ok: true, tenant_id: world, contact: shapeContact(c, value) });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
}
