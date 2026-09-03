// useCurrentUserSlug -- resolve the viewer's agent-style slug inside the
// current tenant. R14e-4 (viewing-user model, not tenant-owner model):
// "which agent slug does THIS viewer map to inside this tenant?" Patrik
// is 'patrik' inside the AOM tenant AND inside his future personal tenant.
// Ash is 'ash' inside AOM. Ben is 'ben' inside his own tenant. Etc.
//
// corner:retire-supabase (2026-09-03): the source of truth is the Convex
// memberships table (worlds:membersOf), which replaced tenant_users. The
// membership row carries the person's name and email; the slug is the first
// word of the name, lower-cased (Patrik Matheson -> patrik), falling back to
// the part of the email before the @ when there is no name.
//
// Returns `null` until resolved (loading), the slug on success, or `null`
// if the viewer has no membership row for this tenant. Null-safe:
// downstream filters (`task.agent === currentUserSlug`) match nothing
// when it's null, which is the right default for "viewer is unknown."

import { useEffect, useState } from 'react'
import { convexQuery, convexWorldId } from '../cv6next/data/convexClient.js'
import { convexViewerIdentity } from '../cv6next/data/convexIdentity.js'

function clean(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return text || ''
}

function slugFromMember(member, email) {
  const name = String(member?.name || '').trim()
  const first = name.split(/\s+/)[0] || ''
  const fromName = first.toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (fromName) return fromName
  const fromEmail = String(email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return fromEmail || null
}

export function useCurrentUserSlug(currentUser, worldId) {
  const [slug, setSlug] = useState(null)

  useEffect(() => {
    if (!worldId) {
      setSlug(null)
      return
    }
    let cancelled = false
    ;(async () => {
      // The caller may hand us a user object (with an email) or nothing; the
      // Convex session is the fallback either way.
      let email = clean(currentUser?.email)
      if (!email) {
        try { email = clean((await convexViewerIdentity()).userEmail) } catch { email = '' }
      }
      if (!email) { if (!cancelled) setSlug(null); return }
      let members = []
      try { members = await convexQuery('worlds:membersOf', { worldId: convexWorldId(worldId) }) } catch { members = [] }
      if (cancelled) return
      const me = (Array.isArray(members) ? members : []).find((m) => clean(m?.email) === email)
      setSlug(me ? slugFromMember(me, email) : null)
    })().catch(() => { if (!cancelled) setSlug(null) })
    return () => { cancelled = true }
  }, [currentUser?.id, currentUser?.email, worldId])

  return slug
}
