// api/dashboard/set-supabase-client-context.js
// Multi-tenant client_id resolver for API endpoints.
//
// All API endpoints use SUPABASE_SERVICE_ROLE_KEY, which bypasses Postgres RLS.
// Multi-tenancy is therefore enforced via explicit client_id filters in every query.
// This utility centralises client_id resolution so every endpoint uses the same logic.
//
// Resolution order:
//   1. directClientId (passed explicitly, e.g. from req.body.client_id)
//   2. worldId        (UUID from worlds.id -- looked up to get the slug)
//   3. DEFAULT_CLIENT_ID ('aom' -- internal AOM world, backward-compatible fallback)

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_CLIENT_ID = 'aom';

/**
 * Resolves the client_id for the current request.
 *
 * @param {object} opts
 * @param {string} [opts.worldId]      UUID of the world (worlds.id) -- used when client_id is not known directly
 * @param {string} [opts.clientId]     Direct client_id slug (e.g. 'aom', 'acme') -- takes priority over worldId
 * @returns {Promise<string>}          Resolved client_id slug (always lowercase, trimmed)
 * @throws {Error}                     If worldId is provided but the lookup fails or returns no rows
 */
export async function resolveClientId({ worldId, clientId } = {}) {
  // Direct slug always wins
  if (clientId && typeof clientId === 'string' && clientId.trim()) {
    return clientId.trim().toLowerCase();
  }

  // Resolve slug from world UUID
  if (worldId && typeof worldId === 'string' && worldId.trim()) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase not configured -- cannot resolve client_id from world_id');
    }

    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?id=eq.${encodeURIComponent(worldId.trim())}&select=client_id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Failed to resolve client_id from world_id ${worldId}: ${errText}`);
    }

    const rows = await resp.json();
    if (!rows || rows.length === 0) {
      throw new Error(`World not found: ${worldId}`);
    }

    const resolved = rows[0].client_id;
    if (!resolved) {
      throw new Error(`World ${worldId} has no client_id assigned`);
    }

    return resolved;
  }

  // Fail-closed: no implicit fallback — caller must supply context
  throw new Error('Missing client: provide clientId or worldId');
}
