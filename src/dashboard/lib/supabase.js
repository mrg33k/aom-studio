// Supabase client for Corner dashboard
// Uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (client-safe, read-only capable)
// These must be set in Vercel env vars with VITE_ prefix to be exposed to the browser.
//
// Fixture mode: set VITE_USE_FIXTURES=1 in .env.local to swap the real client
// for a fake one backed by JSON snapshots under src/dashboard/__fixtures__/latest.
// Run `npm run snapshot` first to populate the fixtures. The dynamic import below
// is dead-code-eliminated when the flag is off, so prod builds never see the
// fake client or the fixture JSON.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === '1'

let _supabase = null

if (USE_FIXTURES) {
  import('./fixtureClient.js').then(({ fixtureClient, fixtureSummary }) => {
    _supabase = fixtureClient
    // eslint-disable-next-line no-console
 console.log('[supabase] FIXTURE MODE, using local JSON snapshot:', fixtureSummary())
  })
} else if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

// Returns null if env vars are missing AND fixture mode is off.
// All callers should guard: if (!supabase) { fall back to local API }
export const supabase = _supabase

// messages table schema:
//   id          uuid primary key default gen_random_uuid()
//   timestamp  timestamptz default now()
//   agent       text  -- agent slug e.g. "elon", "bobby"
//   role        text  -- "user" | "assistant"
//   text        text  -- message content
//   source      text  -- "corner-dashboard" | "terminal" | "telegram" | "auto-responder"
//   status      text  -- "pending" | "read"

// text_files table schema (paste zone / transcripts):
//   CREATE TABLE text_files (
//     id          uuid primary key default gen_random_uuid(),
//     client_id   text not null default 'default',
//     filename    text not null,
//     content     text not null,
//     type        text not null default 'text',
//     created_at  timestamptz default now()
//   );
//   CREATE INDEX idx_text_files_client ON text_files(client_id);
//   -- RLS: enable row-level security, allow authenticated users to CRUD their own client_id

export function mapSupabaseMsg(m) {
  return {
    id:      m.id,
    role:    m.role || 'assistant',
    content: m.text || '',
    time:    m.timestamp || '',
    source:  m.source || 'supabase',
  }
}