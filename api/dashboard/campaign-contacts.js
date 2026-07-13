// /api/dashboard/campaign-contacts — corner:campaign-tool R3.
// Pipeline lists + city detail. 19k-row audiences are always paginated;
// the UI never loads the whole table.
//   GET   ?world=&id=&stage=contacted&limit=50&offset=0&q=springfield
//   GET   ?world=&id=&contact=<uuid>       — single contact + touch history
//   PATCH {world, id, contact_id, notes?, follow_up_due_at?}
// Stage moves go through campaign-actions (op=set_stage) so they're logged.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STAGES = new Set(['to_contact', 'contacted', 'replied', 'call_set', 'won', 'lost', 'bounced', 'noise']);

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

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

  const id = String(req.query.id || (req.body && req.body.id) || '');
  if (!id) return res.status(400).json({ error: 'id (campaign) required' });

  try {
    if (req.method === 'GET' && req.query.contact) {
      const contactId = String(req.query.contact);
      const [cr, er] = await Promise.all([
        sb(`campaign_contacts?id=eq.${contactId}&campaign_id=eq.${id}&world=eq.${encodeURIComponent(world)}&select=*`),
        sb(`campaign_events?contact_id=eq.${contactId}&campaign_id=eq.${id}&select=id,kind,summary,details,created_at&order=created_at.desc&limit=50`),
      ]);
      if (!cr.ok) return res.status(cr.status).json({ error: await cr.text() });
      const contacts = await cr.json();
      if (!contacts.length) return res.status(404).json({ error: 'contact not found' });
      const events = er.ok ? await er.json() : [];
      const sr = await sb(`campaign_sends?campaign_id=eq.${id}&contact_id=eq.${contactId}&select=sent_at,thread_id,message_id&order=sent_at.desc`);
      const sends = sr.ok ? await sr.json() : [];
      return res.status(200).json({ ok: true, contact: contacts[0], events, sends });
    }

    if (req.method === 'GET') {
      const stage = String(req.query.stage || '');
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
      const q = String(req.query.q || '').trim();

      let filter = `campaign_id=eq.${id}&world=eq.${encodeURIComponent(world)}`;
      if (stage && STAGES.has(stage)) filter += `&stage=eq.${stage}`;
      if (req.query.flagged === '1') filter += `&hygiene_flag=not.is.null`;
      if (q) {
        const safe = q.replace(/[%,()]/g, '');
        filter += `&or=(name.ilike.*${safe}*,email.ilike.*${safe}*,merge_fields->>city.ilike.*${safe}*)`;
      }
      // enriched (emailable) first within to_contact, then biggest population
      const order = stage === 'to_contact'
        ? 'order=email.desc.nullslast,merge_fields->>population.desc.nullslast'
        : 'order=updated_at.desc';
      const r = await sb(
        `campaign_contacts?${filter}&select=id,name,email,stage,merge_fields,hygiene_flag,last_contacted_at,last_reply_at,follow_up_due_at,reply_thread_id&${order}&limit=${limit}&offset=${offset}`,
        { prefer: 'count=exact' }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const contacts = await r.json();
      const range = r.headers.get('content-range') || '';
      const total = parseInt(range.split('/')[1], 10);
      return res.status(200).json({
        ok: true,
        contacts,
        total: Number.isFinite(total) ? total : contacts.length,
        hasMore: Number.isFinite(total) ? offset + contacts.length < total : false,
      });
    }

    if (req.method === 'PATCH') {
      const b = req.body || {};
      if (!b.contact_id) return res.status(400).json({ error: 'contact_id required' });
      const patch = { updated_at: new Date().toISOString() };
      if ('notes' in b) patch.notes = b.notes || null;
      if ('follow_up_due_at' in b) patch.follow_up_due_at = b.follow_up_due_at || null;
      if (Object.keys(patch).length === 1) return res.status(400).json({ error: 'nothing to update' });
      const r = await sb(
        `campaign_contacts?id=eq.${b.contact_id}&campaign_id=eq.${id}&world=eq.${encodeURIComponent(world)}`,
        { method: 'PATCH', body: JSON.stringify(patch) }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows = await r.json();
      if (!rows.length) return res.status(404).json({ error: 'contact not found' });
      return res.status(200).json({ ok: true, contact: rows[0] });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
}
