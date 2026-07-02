// api/_lib/stateStore.js — Supabase-backed JSON state for dashboard tools.
//
// Replaces the disk+tunnel persistence pattern (readSource/writeSource against
// rag.aheadofmarket.com) for the small JSON state stores: trackers, cv6 bugs,
// review comments/checklists, room goal steps. Those stores used to live as
// JSON files under corner/users/aom/missions/master-loop/deliverables/ and
// only persisted while the RAG tunnel to Patrik's Mac was up — Vercel has no
// disk, so a down tunnel meant writes silently vanished (corner:state-to-supabase R1).
//
// Storage: the existing `cm_state` table (kind, scope_id, client_id, payload,
// updated_at) — same table project-summary reads. Service-role key required
// (cm_state has RLS on). One row per (store kind, scope, world).
//
// Self-migration: stateGetWithLegacy() falls back to the legacy JSON file
// (tunnel, then local disk) when no row exists yet, and upserts what it found
// so the second read never needs the tunnel again.

import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const sbHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
});

export function stateConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

// Read one payload. Returns the payload object or null (missing row / error).
export async function stateGet(kind, scopeId, clientId) {
  if (!stateConfigured()) return null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/cm_state` +
      `?kind=eq.${encodeURIComponent(kind)}` +
      `&scope_id=eq.${encodeURIComponent(scopeId)}` +
      `&client_id=eq.${encodeURIComponent(clientId)}` +
      `&select=payload&limit=1`,
      { headers: sbHeaders() }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? rows[0].payload : null;
  } catch (_) {
    return null;
  }
}

// Upsert one payload. Returns true on success — callers surface a 500 on
// false the same way the old writeSource() contract did.
export async function stateSet(kind, scopeId, clientId, payload) {
  if (!stateConfigured()) return false;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/cm_state?on_conflict=kind,scope_id,client_id`,
      {
        method: 'POST',
        headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify([{
          kind,
          scope_id: scopeId,
          client_id: clientId,
          payload,
          updated_at: new Date().toISOString(),
        }]),
      }
    );
    return r.ok;
  } catch (_) {
    return false;
  }
}

// Read a legacy JSON state file: tunnel first (prod), local disk second (dev).
// Returns the parsed object or null. Used only for one-time self-migration.
export async function legacyFileRead(relPath) {
  try {
    const url = `${RAG_TUNNEL_URL}/project-file-raw?path=${encodeURIComponent(relPath)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
    if (r.ok) return JSON.parse(await r.text());
  } catch (_) { /* fall through */ }
  try {
    const p = path.join(AOM_EA_ROOT, relPath);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) { /* ignore */ }
  return null;
}

// Canonical read for a migrated store: cm_state first; when the row does not
// exist yet, pull the legacy file, slice out this world's piece via
// `fromLegacy(parsedFile)`, upsert it, and return it. `fromLegacy` returning
// null/undefined means "nothing to migrate" and yields `empty`.
export async function stateGetWithLegacy({ kind, scopeId, clientId, legacyPath, fromLegacy, empty }) {
  const existing = await stateGet(kind, scopeId, clientId);
  if (existing != null) return existing;
  const legacy = await legacyFileRead(legacyPath);
  const slice = legacy ? fromLegacy(legacy) : null;
  if (slice != null) {
    await stateSet(kind, scopeId, clientId, slice); // best effort; read still succeeds
    return slice;
  }
  return empty;
}
