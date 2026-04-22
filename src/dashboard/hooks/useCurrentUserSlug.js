// useCurrentUserSlug -- resolve the viewer's agent-style slug inside the
// current tenant. R14e-4 (viewing-user model, not tenant-owner model):
// "which agent slug does THIS viewer map to inside this tenant?" Patrik
// is 'patrik' inside the AOM tenant AND inside his future personal tenant.
// Ash is 'ash' inside AOM. Ben is 'ben' inside his own tenant. Etc.
//
// Source of truth: `tenant_users.slug` keyed on (tenant_id, auth.uid()).
// RLS allows a user to read only their own membership row, so the query
// runs from the authenticated browser client -- no server-side plumbing.
//
// Returns `null` until resolved (loading), the slug on success, or `null`
// if the viewer has no membership row for this tenant. Null-safe:
// downstream filters (`task.agent === currentUserSlug`) match nothing
// when it's null, which is the right default for "viewer is unknown."

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useCurrentUserSlug(currentUser, worldId) {
  const [slug, setSlug] = useState(null)

  useEffect(() => {
    if (!supabase || !currentUser?.id || !worldId) {
      setSlug(null)
      return
    }
    let cancelled = false
    supabase
      .from('tenant_users')
      .select('slug')
      .eq('user_id', currentUser.id)
      .eq('tenant_id', worldId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setSlug(data?.slug || null)
      })
      .catch(() => {
        if (!cancelled) setSlug(null)
      })
    return () => { cancelled = true }
  }, [currentUser?.id, worldId])

  return slug
}
