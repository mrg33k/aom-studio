// Retired (corner:retire-supabase, 2026-09-03). Convex is the only backend.
//
// This file stays only because files outside the R2/R3 rewrite still import
// `supabase` from it and gate on `if (!supabase)`. Exporting null makes every one
// of those gates take its render-only branch instead of touching a database that
// is banned. Delete this file once no importer is left (see the R5 sweep).
//
// New code: import from './convex.js' (convexQuery, convexMutation, getViewer,
// hasSession, useConvexLive) and from './auth.js' for sign-in.

export const supabase = null;

// Old row shape mapper kept for the last legacy importers.
export function mapSupabaseMsg(m) {
  return {
    id: m.id,
    role: m.role || 'assistant',
    content: m.text || '',
    time: m.timestamp || '',
    source: m.source || 'legacy',
  };
}
