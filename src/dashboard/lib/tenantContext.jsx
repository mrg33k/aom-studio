import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { getClientId, setClientIdFromUser, clearWorldOverride } from './clientConfig.js'

export const RENDER_ONLY_TENANT_ID = 'local-render'

const TenantContext = createContext({
  status: 'loading',
  tenant: null,
  worldId: null,
  refresh: () => {},
})

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function aliasesFor(user, tenantId) {
  const meta = user?.user_metadata || {}
  return Array.from(new Set([
    tenantId,
    normalize(meta.world),
    normalize(meta.tenant_id),
    normalize(meta.client_id),
  ].filter(Boolean)))
}

export function TenantProvider({ children }) {
  const [user, setUser] = useState(null)
  const [tenantId, setTenantId] = useState(() => (supabase ? null : RENDER_ONLY_TENANT_ID))
  const [status, setStatus] = useState(() => (supabase ? 'loading' : 'ready'))

  const applyUser = useCallback((nextUser) => {
    if (!supabase) {
      setUser(null)
      setTenantId(RENDER_ONLY_TENANT_ID)
      setStatus('ready')
      return
    }
    if (nextUser) setClientIdFromUser(nextUser)
    const resolved = nextUser ? getClientId() : null
    setUser(nextUser || null)
    setTenantId(resolved || null)
    setStatus('ready')
  }, [])

  const refresh = useCallback(() => {
    if (!supabase) {
      applyUser(null)
      return
    }
    setStatus('loading')
    supabase.auth.getUser()
      .then(({ data }) => applyUser(data?.user || null))
      .catch(() => applyUser(null))
  }, [applyUser])

  useEffect(() => {
    refresh()
    if (!supabase) return undefined
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // A world override must never survive a logout into another account
      // (corner:tenant-isolation R1). Fresh page loads are already handled by
      // the boot purge in clientConfig.js.
      if (event === 'SIGNED_OUT') clearWorldOverride()
      applyUser(session?.user || null)
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [applyUser, refresh])

  const tenant = useMemo(() => {
    if (!tenantId) return null
    return {
      tenantId,
      canonicalSlug: tenantId,
      aliases: aliasesFor(user, tenantId),
      userId: user?.id || null,
      renderOnly: !supabase,
    }
  }, [tenantId, user])

  return (
    <TenantContext.Provider value={{ status, tenant, worldId: tenant?.tenantId || null, refresh }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantContext() {
  return useContext(TenantContext)
}

export function useWorldId() {
  return useTenantContext().worldId
}
