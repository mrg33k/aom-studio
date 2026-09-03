// api/_lib/stateStore.js: keyed JSON state for dashboard tools (trackers, cv6
// bugs, review comments and checklists, room goals, prospect reports).
//
// corner:retire-supabase R2: the rows live in the Convex `state` table
// (kind, scopeId, world, value), written through state:put and read through
// state:get. Same (kind, scopeId, clientId) key the old cm_state rows used, so
// the ten callers did not change.
//
// Self-migration: stateGetWithLegacy() falls back to the legacy JSON file
// (tunnel, then local disk) when no row exists yet, and writes what it found
// so the second read never needs the tunnel again.

import fs from 'fs';
import path from 'path';
import { convexQuery, convexMutation } from './verifyTenant.js';

const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

// Convex is always configured; kept for the callers that gate on it.
export function stateConfigured() {
  return true;
}

// Read one payload. Returns the payload object or null (missing row / error).
export async function stateGet(kind, scopeId, clientId) {
  try {
    const row = await convexQuery('state:get', {
      kind: String(kind),
      scopeId: String(scopeId ?? ''),
      worldSlug: clientId ? String(clientId) : undefined,
    });
    if (!row || typeof row !== 'object') return null;
    return row.value === undefined ? null : row.value;
  } catch (_) {
    return null;
  }
}

// Upsert one payload. Returns true on success; callers surface a 500 on false.
export async function stateSet(kind, scopeId, clientId, payload) {
  try {
    const r = await convexMutation('state:put', {
      kind: String(kind),
      scopeId: String(scopeId ?? ''),
      worldSlug: clientId ? String(clientId) : undefined,
      value: payload,
      updatedBy: 'aom-studio-api',
    });
    return !!(r && r.ok);
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

// Canonical read for a migrated store: Convex first; when the row does not
// exist yet, pull the legacy file, slice out this world's piece via
// `fromLegacy(parsedFile)`, save it, and return it. `fromLegacy` returning
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
