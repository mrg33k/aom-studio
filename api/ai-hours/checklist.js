// /api/ai-hours/checklist
//
// Stores and retrieves client checklist progress per session. The access code
// is the possession secret: every GET/POST verifies it still maps to a live
// AI Hours client before touching progress.
//
// corner:retire-supabase R3: progress lives in the Convex aiHoursProgress
// table (aiHours:getProgress / setProgress, one row per access code holding
// { [session_number]: checked_items[] }), and the client check is
// aiHours:getClient. Codes: a UUID minted by crypto.randomUUID (122 bits) or
// the legacy SUP-XXXX shape, kept readable for the clients that have them.

import crypto from 'crypto';
import { convexQuery, convexMutation } from '../_lib/verifyTenant.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_SUP_RE = /^SUP-[A-Z0-9]{4}$/;

// Server-minted high-entropy access code (use when creating a new client).
export function mintAccessCode() {
  return crypto.randomUUID();
}

function normalizeAccessCode(raw) {
  const v = String(raw || '').trim();
  if (UUID_RE.test(v)) return v.toLowerCase();
  return v.toUpperCase();
}

// The client row for a code, or null. Clients created through
// /api/ai-hours/clients carry the code as their slug; older rows carry it as
// the Convex-minted accessCode. Both are checked.
async function findClient(code) {
  try {
    const bySlug = await convexQuery('aiHours:getClient', { slug: code });
    if (bySlug) return bySlug;
    return await convexQuery('aiHours:getClient', { accessCode: code });
  } catch {
    return null;
  }
}

async function readProgress(code) {
  try {
    const state = await convexQuery('aiHours:getProgress', { accessCode: code });
    return state && typeof state === 'object' ? state : {};
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  // GET: fetch checked items for a client/session
  if (req.method === 'GET') {
    const { access_code, session } = req.query;
    if (!access_code || !session) {
      return res.status(400).json({ ok: false, error: 'access_code and session required' });
    }
    const normalizedCode = normalizeAccessCode(access_code);
    if (LEGACY_SUP_RE.test(normalizedCode)) {
      console.warn('[checklist] legacy low-entropy SUP-XXXX access_code used for GET');
    }
    const client = await findClient(normalizedCode);
    if (!client) {
      return res.status(404).json({ ok: false, error: 'Access code not found' });
    }
    const progress = await readProgress(normalizedCode);
    const items = progress[String(session)];
    return res.status(200).json({ ok: true, checked_items: Array.isArray(items) ? items : [] });
  }

  // POST: upsert checked items for one session
  if (req.method === 'POST') {
    const { access_code, session_number, checked_items } = req.body || {};
    if (!access_code || session_number === undefined) {
      return res.status(400).json({ ok: false, error: 'access_code and session_number required' });
    }
    const normalizedCode = normalizeAccessCode(access_code);
    if (LEGACY_SUP_RE.test(normalizedCode)) {
      console.warn('[checklist] legacy low-entropy SUP-XXXX access_code used for POST');
    }
    const finalCode = normalizedCode || mintAccessCode();
    if (!UUID_RE.test(finalCode) && !LEGACY_SUP_RE.test(finalCode)) {
      return res.status(400).json({ ok: false, error: 'access_code must be a UUID (crypto.randomUUID) or legacy SUP-XXXX' });
    }
    const client = await findClient(finalCode);
    if (!client) {
      return res.status(404).json({ ok: false, error: 'Access code not found' });
    }
    const progress = await readProgress(finalCode);
    const next = { ...progress, [String(session_number)]: Array.isArray(checked_items) ? checked_items : [] };
    try {
      await convexMutation('aiHours:setProgress', { accessCode: finalCode, state: next });
    } catch (err) {
      return res.status(502).json({ ok: false, error: String(err?.message || err) });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
