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

// Strip http/https URLs from text. URLs contain hostnames that aren't user
// references to projects — Karen's 2026-05-25 PDF upload was mis-tagged with
// project="aheadofmarket" because the file URL was
// https://rag.aheadofmarket.com/files/karens-world/14cd2da3-Invoice.pdf and
// the fuzzy substring matcher found "aheadofmarket" inside the hostname.
// Also strips bare www.<host> patterns for completeness.
function stripUrlsForMatch(text) {
  if (!text) return ''
  return text
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.[^\s]+/gi, ' ')
}

// Word-boundary substring match. Prevents "ambition" from matching "ambitions"
// or "ambition-mechanical" from accidentally matching only "ambition". Treats
// hyphens as word characters since slugs contain them.
function wordBoundaryIncludes(haystack, needle) {
  if (!haystack || !needle) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:^|[^\\w-])${escaped}(?:[^\\w-]|$)`, 'i')
  return re.test(haystack)
}

// Tag-first, then slug/name match against the projects table. Returns slug or null.
export async function detectProjectFromText({ text, supabaseUrl, headers }) {
  const tag = detectProjectTag(text)
  if (tag) return tag
  if (!text || !supabaseUrl) return null
  // Strip URLs before fuzzy matching — see stripUrlsForMatch for the receipt.
  const cleanText = stripUrlsForMatch(text)
  if (!cleanText.trim()) return null
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/projects?select=slug,name&is_active=eq.true`,
      { headers }
    )
    if (!res.ok) return null
    const projects = await res.json()
    for (const p of projects) {
      if (p.slug && wordBoundaryIncludes(cleanText, p.slug)) return p.slug
      if (p.name && p.name.length > 2 && wordBoundaryIncludes(cleanText, p.name)) return p.slug
    }
  } catch (_) { /* best-effort */ }
  return null
}

// Who is entitled to be in <project>'s shared room, straight from the two
// tables that define it: the holder world (projects.client_id) and every world
// holding a project_access grant. Returns null when the project has no row, and
// on ANY lookup error — fail-closed, because a skipped crosspost is recoverable
// (reconcile-shared-rooms.py serves the same room set and self-heals within
// minutes) while a junk or foreign-stamped shared:<slug> row is forever.
//
// Same three facts verifyTenant.js::hasSharedProjectAccess reads, in the same
// order of authority. Deliberately does NOT include the participation floor:
// that floor reads messages.world_id, and the whole r4 defect is that this
// function is one of the things that WRITES messages.world_id. A gate that
// consults evidence it also mints is the self-service loop rounds 2 and 3 kept
// re-shipping.
async function sharedRoomWorlds({ supabaseUrl, headers, project }) {
  try {
    const pr = await fetch(
      `${supabaseUrl}/rest/v1/projects?slug=eq.${encodeURIComponent(project)}&select=id,client_id&limit=1`,
      { headers }
    )
    if (!pr.ok) return null
    const [row] = await pr.json()
    if (!row?.id) return null
    const ar = await fetch(
      `${supabaseUrl}/rest/v1/project_access?project_id=eq.${encodeURIComponent(row.id)}&select=client_id&limit=50`,
      { headers }
    )
    if (!ar.ok) return null
    const access = await ar.json()
    const ownerWorld = row.client_id ? String(row.client_id).toLowerCase() : null
    const granted = new Set(
      access.map(a => (a.client_id ? String(a.client_id).toLowerCase() : null)).filter(Boolean)
    )
    // A shared room only exists when someone OTHER than the holder was invited.
    // Unconditional crossposting spawned phantom threads for missions and
    // fuzzy-tagged slugs (corner:chat R-CROSSPOST-SCOPE, 2026-07-01).
    const hasCollaborator = [...granted].some(w => w !== ownerWorld)
    if (!hasCollaborator) return null
    return { ownerWorld, granted }
  } catch (_) {
    return null
  }
}

// Insert one cross-post row for sourceMessage into shared:<project>.
// No-op when source is already a crosspost, source client_id is already the
// shared thread, or the project has no collaborators (corner:chat
// R-CROSSPOST-SCOPE, 2026-07-01: unconditional crossposting spawned phantom
// shared threads for missions and fuzzy-tagged slugs — user messages piled up
// there with no replies and read as agents going silent). Safe to call on
// retries — duplicate inserts collide on PK.
//
// r4 (2026-07-27) — AND no-op when the source message's world is not entitled to
// that room. This row is the ONLY thing that decides what world_id a shared room
// sees, and world_id is what hasSharedRoomPresence() reads as proof of
// membership. Copying it blind made this function an escalation primitive: tag a
// message in your own world with a project you do not hold, and the crosspost
// stamps YOUR world into a room you were never invited to — after which the
// presence check lets you in for real, full read and write, executable
// voice-handoff rows included. write-message.js now refuses that tag at source;
// this is the second lock, so no future writer can re-open it from another door.
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
  const room = await sharedRoomWorlds({ supabaseUrl, headers, project })
  if (!room) return

  // A world may only be stamped into a room it holds or has been granted. A
  // source carrying NO world is not a threat and is not blocked — it stamps
  // nothing, so it cannot mint presence for anyone (the agent-side and legacy
  // writers are mostly in this shape).
  const sourceWorld = sourceMessage.world_id
    ? String(sourceMessage.world_id).trim().toLowerCase()
    : null
  if (sourceWorld && sourceWorld !== room.ownerWorld && !room.granted.has(sourceWorld)) {
    console.warn(
      `[crosspost] refusing to mirror into "${targetClientId}": source world "${sourceWorld}" neither holds nor is granted this project`,
    )
    return
  }

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
