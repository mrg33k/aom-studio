// Old path for the chat proxy. The handler moved to /api/dashboard/messages
// (corner:retire-supabase R2, 2026-09-03). This re-export keeps every caller
// that still says "supabase-messages" working; delete it once the web, iOS,
// relay and AOM-EA scripts all call /api/dashboard/messages.
export { default } from './messages.js'
