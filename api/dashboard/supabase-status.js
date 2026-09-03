// Old path for the dashboard status snapshot. The handler moved to
// /api/dashboard/status (corner:retire-supabase R2, 2026-09-03). This
// re-export keeps callers that still say "supabase-status" working; delete
// it once useDataPipe, useCommandTracker and AssignButton call /api/dashboard/status.
export { default } from './status.js'
