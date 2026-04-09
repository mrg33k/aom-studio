// Centralized Supabase client utility
// Initialized from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.
// Import this wherever direct Supabase access is needed outside the dashboard.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Returns null if env vars are not set (e.g. local dev without Supabase configured).
// Callers should guard: if (!supabase) { handle gracefully }
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export default supabase
