// Shared [project:slug] cross-post helper.
// Single writer for cross-posts from server-side message writes; the underscore
// prefix keeps this file out of Vercel's serverless routing.
//
// Idempotency: the cross-post row id is a deterministic hash of
// (source_message_id, project) so repeat inserts collide on PK and are ignored
// via Prefer: resolution=ignore-duplicates.

import crypto from 'crypto'

// Deterministic UUID-shaped id from a string. Not RFC 4122 compliant in the
// version/variant bits — PostgreSQL doesn't care, and we only need uniqueness.
function crosspostRowId(sourceId, project) {
  const hash = crypto
    .createHash('sha256')
    .update(`crosspost:${project}:${sourceId}`)
    .digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

// Pull [project:slug] tag from message text (lowercased), else null.
export function detectProjectTag(text) {
  if (!text) return null
  const m = text.match(/\[project:([a-z0-9_-]+)\]/i)
  return m ? m[1].toLowerCase() : null
}

// Tag-first, then slug/name match against the projects table. Returns slug or null.
export async function detectProjectFromText({ text, supabaseUrl, headers }) {
  const tag = detectProjectTag(text)
  if (tag) return tag
  if (!text || !supabaseUrl) return null
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/projects?select=slug,name&is_active=eq.true`,
      { headers }
    )
    if (!res.ok) return null
    const projects = await res.json()
    const lower = text.toLowerCase()
    for (const p of projects) {
      if (p.slug && lower.includes(p.slug.toLowerCase())) return p.slug
      if (p.name && p.name.length > 2 && lower.includes(p.name.toLowerCase())) return p.slug
    }
  } catch (_) { /* best-effort */ }
  return null
}

// Insert one cross-post row for sourceMessage into shared:<project>.
// No-op when source is already a crosspost or source client_id is already the
// shared thread. Safe to call on retries — duplicate inserts collide on PK.
export async function crossPostToProjectThread({
  supabaseUrl,
  headers,
  sourceMessage,
  project,
}) {
  if (!sourceMessage || !project || !supabaseUrl) return
  if (sourceMessage.source === 'crosspost') return
  const targetClientId = `shared:${project}`
  if (sourceMessage.client_id === targetClientId) return
  if (!sourceMessage.id) return // need source id for idempotent row id

  const payload = {
    id: crosspostRowId(sourceMessage.id, project),
    agent: sourceMessage.agent,
    role: sourceMessage.role,
    text: (sourceMessage.text || '').trim(),
    source: 'crosspost',
    client_id: targetClientId,
    project,
    ...(sourceMessage.sender_role ? { sender_role: sourceMessage.sender_role } : {}),
    ...(sourceMessage.world_id ? { world_id: sourceMessage.world_id } : {}),
    ...(sourceMessage.user_id ? { user_id: sourceMessage.user_id } : {}),
    ...(sourceMessage.user_name ? { user_name: sourceMessage.user_name } : {}),
    ...(sourceMessage.attachment_url ? { attachment_url: sourceMessage.attachment_url } : {}),
    ...(sourceMessage.file_mime_type ? { file_mime_type: sourceMessage.file_mime_type } : {}),
    ...(sourceMessage.file_size != null ? { file_size: sourceMessage.file_size } : {}),
    ...(sourceMessage.reply_to ? { reply_to: sourceMessage.reply_to } : {}),
    metadata: {
      ...(sourceMessage.metadata && typeof sourceMessage.metadata === 'object' ? sourceMessage.metadata : {}),
      source_message_id: sourceMessage.id,
      crosspost_source_client_id: sourceMessage.client_id || null,
    },
  }

  try {
    await fetch(`${supabaseUrl}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'return=minimal,resolution=ignore-duplicates',
      },
      body: JSON.stringify(payload),
    })
  } catch (_) { /* best-effort */ }
}
