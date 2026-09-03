import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { RENDER_ONLY_TENANT_ID, hasSession, getViewer, onSessionChange, convexQuery } from './convex.js';
import { getClientId, setClientIdFromUser, clearWorldOverride } from './clientConfig.js';

export { RENDER_ONLY_TENANT_ID };

// TenantProvider (corner:retire-supabase R3): who is signed in and which world
// they are looking at. The world comes from users:viewer (memberships on Convex,
// aom outranks a personal world); an admin can look at another world through the
// session-scoped override in clientConfig.js. With no session the page renders
// in read-only mode with the 'local-render' placeholder tenant.

const TenantContext = createContext({
  status: 'loading',
  tenant: null,
  worldId: null,
  viewer: null,
  refresh: () => {},
});

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function aliasesFor(viewer, tenantId) {
  return Array.from(new Set([
    tenantId,
    normalize(viewer?.worldSlug),
    normalize(viewer?.worldName),
  ].filter(Boolean)));
}

// The viewer's home world slug. users:viewer already ranks memberships; when it
// has none yet (an account made before memberships existed) ask the resolver.
async function resolveWorldSlug(viewer) {
  if (viewer?.worldSlug) return viewer.worldSlug;
  try {
    const r = await convexQuery('worlds:resolveForSession', { email: viewer?.email || undefined });
    return r?.slug || null;
  } catch {
    return null;
  }
}

export function TenantProvider({ children }) {
  const [viewer, setViewer] = useState(null);
  const [tenantId, setTenantId] = useState(() => (hasSession() ? null : RENDER_ONLY_TENANT_ID));
  const [status, setStatus] = useState(() => (hasSession() ? 'loading' : 'ready'));

  const applyViewer = useCallback((nextViewer) => {
    if (!hasSession()) {
      setViewer(null);
      setTenantId(RENDER_ONLY_TENANT_ID);
      setStatus('ready');
      return;
    }
    if (nextViewer) setClientIdFromUser(nextViewer);
    const resolved = nextViewer ? getClientId() : null;
    setViewer(nextViewer || null);
    setTenantId(resolved || null);
    setStatus('ready');
  }, []);

  const refresh = useCallback(() => {
    if (!hasSession()) {
      applyViewer(null);
      return undefined;
    }
    setStatus('loading');
    let cancelled = false;
    getViewer({ force: true })
      .then(async (v) => {
        if (cancelled) return;
        if (!v) { applyViewer(null); return; }
        const slug = await resolveWorldSlug(v);
        if (cancelled) return;
        applyViewer(slug && slug !== v.worldSlug ? { ...v, worldSlug: slug } : v);
      })
      .catch(() => {
        // Offline: keep whatever world we already had; the shell stays usable.
        if (!cancelled) setStatus('ready');
      });
    return () => { cancelled = true; };
  }, [applyViewer]);

  useEffect(() => {
    refresh();
    const off = onSessionChange((session) => {
      if (!session) {
        // A world override must never survive a sign-out into another account.
        clearWorldOverride();
        applyViewer(null);
        return;
      }
      refresh();
    });
    // The world switcher writes the override and fires this event.
    const onOverride = () => {
      if (!hasSession()) return;
      setTenantId(getClientId() || null);
    };
    if (typeof window !== 'undefined') window.addEventListener('corner:world-override', onOverride);
    return () => {
      off();
      if (typeof window !== 'undefined') window.removeEventListener('corner:world-override', onOverride);
    };
  }, [applyViewer, refresh]);

  const tenant = useMemo(() => {
    if (!tenantId) return null;
    return {
      tenantId,
      canonicalSlug: tenantId,
      aliases: aliasesFor(viewer, tenantId),
      userId: viewer?.userId ? String(viewer.userId) : null,
      email: viewer?.email || null,
      isAdmin: !!viewer?.isAdmin,
      renderOnly: !hasSession(),
    };
  }, [tenantId, viewer]);

  return (
    <TenantContext.Provider value={{ status, tenant, worldId: tenant?.tenantId || null, viewer, refresh }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  return useContext(TenantContext);
}

export function useWorldId() {
  return useTenantContext().worldId;
}

export function useViewer() {
  return useTenantContext().viewer;
}
