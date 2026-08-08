// cv6next — real Settings data, shaped to wired/settings/settings.json.
// Loads profile (from session), projects/rooms, and theme preference.
// Real data: user profile, projects (rooms), theme stored in localStorage.
// Held-c (no backing): connections, secrets, agent permissions, notifications.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';
import { setClientIdFromUser } from '../../lib/clientConfig';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function useSettings(worldId = null, externalTheme = null) {
  const [currentUser, setCurrentUser] = useState(null);
  const [projects, setProjects] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cv6-theme') || 'dark';
    }
    return 'dark';
  });
  const [state, setState] = useState('loading');

  const activeTheme = externalTheme || theme;

  // Prime from the current session as well as listening for future auth changes.
  // Relying only on onAuthStateChange left Settings loading indefinitely in
  // clients that mounted after the initial SIGNED_IN event.
  useEffect(() => {
    if (!supabase) { setProjects([]); setState('ready'); return undefined; }
    let alive = true;
    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!alive || !sessionData?.session?.user) return;
      setClientIdFromUser(sessionData.session.user);
      setCurrentUser(sessionData.session.user);
    }).catch(() => { if (alive) setState('error'); });
    return () => { alive = false; };
  }, []);

  const saveProfileIdentity = useCallback(async (draft) => {
    if (!currentUser?.id) return { ok: false, error: 'Sign in to update your profile.' };
    const currentImage = currentUser.user_metadata?.avatar_url || '';
    const body = {
      initials: draft?.initials,
      color: draft?.color,
    };
    const nextImage = String(draft?.image || '');
    const prepared = nextImage.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
    if (prepared) {
      body.mime_type = prepared[1].toLowerCase();
      body.image_base64 = prepared[2];
    } else if (!nextImage && currentImage) {
      body.remove_image = true;
    }

    try {
      const response = await authFetch('/api/dashboard/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return { ok: false, error: payload?.error || 'Your profile could not be updated.' };
      const nextMetadata = {
        ...(currentUser.user_metadata || {}),
        avatar_url: payload.avatar_url || null,
        avatar_initials: payload.initials,
        avatar_color: payload.color,
      };
      setCurrentUser((current) => current ? { ...current, user_metadata: nextMetadata } : current);
      // Refresh the signed session so the new metadata survives leaving Settings
      // and is visible to every surface that reads the authenticated user.
      if (supabase) {
        const { data: refreshed } = await supabase.auth.refreshSession().catch(() => ({ data: null }));
        if (refreshed?.user) setCurrentUser(refreshed.user);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cv6:profile-identity-changed', { detail: payload }));
      }
      return {
        ok: true,
        synced: true,
        identity: { initials: payload.initials, color: payload.color, image: payload.avatar_url || '' },
      };
    } catch {
      return { ok: false, error: 'Your profile could not be updated.' };
    }
  }, [currentUser]);

  // Watch auth state
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setClientIdFromUser(session.user);
        setCurrentUser(session.user);
      }
    });
    return () => sub?.unsubscribe?.();
  }, []);

  // Load projects (rooms) from the API
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await authFetch('/api/dashboard/projects');
        if (res.ok) {
          const json = await res.json();
          setProjects(json.projects || []);
          setState('ready');
        } else {
          setState('error');
        }
      } catch (e) {
        console.error('Failed to load projects:', e);
        setState('error');
      }
    })();
  }, [currentUser]);

  // Listen for theme changes (both from this component and external changes)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'cv6-theme' && e.newValue) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const data = useMemo(() => {
    const sections = [
      { id: 'env', label: 'Environment', sub: 'Everything your agents can see and act on.', active: 'on' },
      { id: 'agents', label: 'Agents & permissions', sub: 'What each agent may do on its own.' },
      { id: 'notify', label: 'Notifications', sub: 'How and when you hear from your agents.' },
      { id: 'appear', label: 'Appearance', sub: 'Themes and visual preferences.' },
      { id: 'profile', label: 'Profile', sub: 'Your account details.' },
      { id: 'setup', label: 'Re-run setup', sub: 'Walk through onboarding again.' },
    ];

    const activeSection = sections[0]; // Environment is default

    // Profile (REAL from session)
    const displayName = currentUser?.user_metadata?.full_name
      || currentUser?.user_metadata?.display_name
      || currentUser?.user_metadata?.name
      || currentUser?.email?.split('@')[0]
      || 'User';
    const savedColor = currentUser?.user_metadata?.avatar_color;
    const profile = currentUser ? {
      initials: currentUser.user_metadata?.avatar_initials || initials(displayName),
      color: /^#[0-9a-f]{6}$/i.test(String(savedColor || '')) ? savedColor : '#2563EB',
      image: currentUser.user_metadata?.avatar_url || '',
      name: displayName,
      email: currentUser.email || '',
    } : { initials: '·', color: '#2563EB', image: '', name: '', email: '' };

    // Connections (HELD-C: no OAuth wiring yet)
    const connections = [
      {
        id: 'email',
        name: 'Email',
        desc: 'Read & draft replies',
        tint: 'pink',
        connected: false,
        scope: 'All rooms',
        scopePrivate: false,
      },
    ];

    // Rooms & scope (REAL room names from the projects API; the sharing/scope store
    // does not exist yet, so we do NOT invent member counts. Single-tenant default is
    // private — honest, not a fabricated "Shared · N".)
    const rooms = (projects || []).map((p, i) => ({
      id: p.id || p.slug,
      name: p.name || p.slug || 'Project',
      tint: ['violet', 'accent', 'pink'][i % 3],
      shared: false,
      scopeLabel: 'Private',
      caution: '',
    }));

    // Secrets & keys (HELD-C: no secret store. Honest zero, never a fabricated
    // "3 keys · rotated 12d ago".)
    const secrets = { count: 0, lastRotated: 'never' };

    // Agents & permissions (HELD-C: no permissions store + no enforcement. We will not
    // fabricate per-agent on/off states — that misrepresents what an agent may do.
    // Empty until a real permissions source exists.)
    const agents = [];

    // Notifications (HELD-C: no prefs store. Empty rather than fabricated toggle states.)
    const notifications = [];

    // Themes (REAL: read from localStorage and setTheme action wires back)
    const themes = [
      { id: 'dark', label: 'Dark', selected: activeTheme === 'dark' ? 'on' : false },
      { id: 'light', label: 'Light', selected: activeTheme === 'light' ? 'on' : false },
      { id: 'glass', label: 'Glass', selected: activeTheme === 'glass' ? 'on' : false },
    ];

    return {
      sections, activeSection, profile,
      connections, rooms, secrets,
      agents, notifications, themes,
    };
  }, [currentUser, projects, activeTheme]);

  return { state, data, saveProfileIdentity };
}
