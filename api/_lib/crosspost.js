// Shared [project:slug] cross-post helper.
// Single writer for cross-posts from server-side message writes; the underscore
// prefix keeps this file out of Vercel's serverless routing.
//
// corner:retire-supabase R2: the mirror row goes through messages:send into the
// holder world's project room (`<ownerWorld>:project:<slug>`). Idempotency is
// the clientMessageId Convex de-duplicates on: a deterministic hash of
// (source message id, project), so a retry returns the row it already wrote.
//
// WHAT CHANGED ON PURPOSE. Only ASSISTANT rows are mirrored. Convex dispatches
// its agents on every human-role row that lands in a room (ai:dispatchMessage
// runs from messages:send), so mirroring a person's message into a second
// room would make the agents answer it twice. The agents already read the
// project room; the person's words reach them there through the room itself.

import crypto from 'crypto'
import { convexQuery, convexMutation, lookupProjectBySlug } from './verifyTenant.js'

// Deterministic id from a string, used as the Convex clientMessageId.
function crosspostClientMessageId(sourceId, project) {
  const hash = crypto
    .createHash('sha256')
    .update(`crosspost:${project}:${sourceId}`)
    .digest('hex')
  return `crosspost-${hash.slice(0, 40)}`
}

// Pull [project:slug] tag from message text (lowercased), else null.
export function detectProjectTag(text) {
  if (!text) return null
  const m = text.match(/\[project:([a-z0-9_-]+)\]/i)
  return m ? m[1].toLowerCase() : null
}

// Strip http/https URLs from text. URLs contain hostnames that are not user
// references to projects (a file URL under rag.aheadofmarket.com was once
// fuzzy-matched to project "aheadofmarket").
function stripUrlsForMatch(text) {
  if (!text) return ''
  return text
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.[^\s]+/gi, ' ')
}

// Word-boundary substring match. Treats hyphens as word characters since
// slugs contain them.
function wordBoundaryIncludes(haystack, needle) {
  if (!haystack || !needle) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:^|[^\\w-])${escaped}(?:[^\\w-]|$)`, 'i')
  return re.test(haystack)
}

// Tag-first, then slug/name match against the project registry. Returns slug
// or null. `supabaseUrl` and `headers` are accepted and ignored so the old call
// shape still works.
export async function detectProjectFromText({ text, clientId } = {}) {
  const tag = detectProjectTag(text)
  if (tag) return tag
  if (!text) return null
  const cleanText = stripUrlsForMatch(text)
  if (!cleanText.trim()) return null
  try {
    const projects = await convexQuery('projects:list', clientId ? { worldSlug: clientId, activeOnly: true } : { activeOnly: true })
    for (const p of Array.isArray(projects) ? projects : []) {
      if (p.slug && wordBoundaryIncludes(cleanText, p.slug)) return p.slug
      if (p.name && p.name.length > 2 && wordBoundaryIncludes(cleanText, p.name)) return p.slug
    }
  } catch (_) { /* best-effort */ }
  return null
}

// Who is entitled to be in <project>'s shared room, straight from the two
// facts that define it: the holder world and every world holding a grant.
// Returns null when the project has no row, when nobody but the holder is
// granted (no shared room exists then), and on ANY lookup error. Fail closed:
// a skipped crosspost is recoverable, a junk mirror row is forever.
async function sharedRoomWorlds({ project }) {
  try {
    const row = await lookupProjectBySlug(project)
    if (!row?.projectId) return null
    const access = await convexQuery('projects:access', { projectId: row.projectId })
    const ownerWorld = row.ownerWorld || null
    const granted = new Set(
      (Array.isArray(access) ? access : []).map((a) => (a.worldSlug ? String(a.worldSlug).toLowerCase() : null)).filter(Boolean)
    )
    const hasCollaborator = [...granted].some((w) => w !== ownerWorld)
    if (!hasCollaborator) return null
    return { ownerWorld, granted }
  } catch (_) {
    return null
  }
}

// Mirror one assistant row for sourceMessage into the project's room.
// No-op when the source is already a crosspost, when the source already sits
// in that room, when the project has no collaborators, or when the source
// world neither holds nor is granted the project (the second lock: a world
// may only be stamped into a room it is entitled to).
export async function crossPostToProjectThread({
  sourceMessage,
  project,
}) {
  if (!sourceMessage || !project) return
  if (sourceMessage.source === 'crosspost') return
  if (!sourceMessage.id) return
  if (sourceMessage.role !== 'assistant') {
    console.log(`[crosspost] not mirroring a ${sourceMessage.role || 'user'} row into project "${project}": Convex agents already read that room`)
    return
  }
  const room = await sharedRoomWorlds({ project })
  if (!room || !room.ownerWorld) return

  const targetRoomId = `${room.ownerWorld}:project:${project}`
  if (sourceMessage.room_id === targetRoomId) return

  const sourceWorld = sourceMessage.world_id
    ? String(sourceMessage.world_id).trim().toLowerCase()
    : (sourceMessage.client_id && !String(sourceMessage.client_id).startsWith('shared:')
        ? String(sourceMessage.client_id).trim().toLowerCase()
        : null)
  if (sourceWorld && sourceWorld !== room.ownerWorld && !room.granted.has(sourceWorld)) {
    console.warn(
      `[crosspost] refusing to mirror into "${targetRoomId}": source world "${sourceWorld}" neither holds nor is granted this project`,
    )
    return
  }

  try {
    await convexMutation('messages:send', {
      roomId: targetRoomId,
      clientId: room.ownerWorld,
      clientMessageId: crosspostClientMessageId(sourceMessage.id, project),
      text: String(sourceMessage.text || '').trim(),
      role: 'assistant',
      agentSlug: sourceMessage.agent || 'corner',
      source: 'crosspost',
      userName: sourceMessage.user_name || undefined,
      metadata: {
        ...(sourceMessage.metadata && typeof sourceMessage.metadata === 'object' ? sourceMessage.metadata : {}),
        source_message_id: sourceMessage.id,
        crosspost_source_client_id: sourceMessage.client_id || null,
        crosspost_source_room_id: sourceMessage.room_id || null,
      },
    })
  } catch (_) { /* best-effort */ }
}
