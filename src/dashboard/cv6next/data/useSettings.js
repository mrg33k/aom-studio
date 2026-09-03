// cv6next: real Settings data, shaped to wired/settings/settings.json.
// Loads profile (from the Convex session), projects (projects:list), and the
// theme preference (localStorage).
// Held-c (no backing): connections, secrets, agent permissions, notifications.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getViewer, hasSession, onSessionChange, convexQuery, convexMutation, convexWorldId, invalidateViewer } from '../../lib/convex.js';
import { setClientIdFromUser } from '../../lib/clientConfig';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// Turn a data: URL into the bytes Convex storage wants.
function dataUrlToBlob(mime, base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
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

  // Prime from the current session and follow every later sign in / sign out.
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (!hasSession()) {
        if (alive) { setCurrentUser(null); setProjects([]); setState('ready'); }
        return;
      }
      getViewer().then((viewer) => {
        if (!alive || !viewer) return;
        setClientIdFromUser(viewer);
        setCurrentUser(viewer);
      }).catch(() => { if (alive) setState('error'); });
    };
    load();
    const off = onSessionChange(load);
    return () => { alive = false; off(); };
  }, []);

  const saveProfileIdentity = useCallback(async (draft) => {
    if (!currentUser?.userId) return { ok: false, error: 'Sign in to update your profile.' };
    const currentImage = currentUser.avatarUrl || '';
    const args = {
      userId: String(currentUser.userId),
      initials: draft?.initials,
      color: draft?.color,
    };
    const nextImage = String(draft?.image || '');
    const prepared = nextImage.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
    try {
      if (prepared) {
        // Bytes go to Convex storage first (files:generateUploadUrl), then the
        // storage id is saved on the person's row.
        const uploadUrl = await convexMutation('files:generateUploadUrl', {});
        const mime = prepared[1].toLowerCase();
        const upload = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': mime }, body: dataUrlToBlob(mime, prepared[2]) });
        if (!upload.ok) return { ok: false, error: 'Your photo could not be uploaded.' };
        const { storageId } = await upload.json();
        if (storageId) args.avatarStorageId = storageId;
      } else if (!nextImage && currentImage) {
        args.removeImage = true;
      }
      const shape = await convexMutation('users:saveProfile', args);
      invalidateViewer();
      if (shape) setCurrentUser(shape);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cv6:profile-identity-changed', {
          detail: { initials: shape?.initials, color: shape?.color, avatar_url: shape?.avatarUrl || null },
        }));
      }
      return {
        ok: true,
        synced: true,
        identity: { initials: shape?.initials || args.initials, color: shape?.color || args.color, image: shape?.avatarUrl || '' },
      };
    } catch {
      return { ok: false, error: 'Your profile could not be updated.' };
    }
  }, [currentUser]);

  // Load projects (rooms) for the person's world.
  useEffect(() => {
    if (!currentUser) return undefined;
    let alive = true;
    const worldSlug = convexWorldId(worldId) || currentUser.worldSlug || null;
    (async () => {
      try {
        const rows = await convexQuery('projects:list', worldSlug ? { worldSlug } : {});
        if (!alive) return;
        setProjects((Array.isArray(rows) ? rows : []).map((p) => ({ id: p.slug || String(p._id), slug: p.slug, name: p.name })));
        setState('ready');
      } catch (e) {
        console.error('Failed to load projects:', e);
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
  }, [currentUser, worldId]);

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

    // Profile (REAL from the session)
    const displayName = currentUser?.name
      || currentUser?.email?.split('@')[0]
      || 'User';
    const savedColor = currentUser?.color;
    const profile = currentUser ? {
      initials: currentUser.initials || initials(displayName),
      color: /^#[0-9a-f]{6}$/i.test(String(savedColor || '')) ? savedColor : '#2563EB',
      image: currentUser.avatarUrl || '',
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

    // Rooms & scope (REAL room names from projects:list; the sharing/scope store
    // does not exist yet, so we do NOT invent member counts. Single-tenant default is
    // private: honest, not a fabricated "Shared · N".)
    const rooms = (projects || []).map((p, i) => ({
      id: p.id || p.slug,
      name: p.name || p.slug || 'Project',
      tint: ['violet', 'accent', 'pink'][i % 3],
      shared: false,
      scopeLabel: 'Private',
      caution: '',
    }));

    // Secrets & keys (HELD-C: no secret store. Honest zero.)
    const secrets = { count: 0, lastRotated: 'never' };

    // Agents & permissions (HELD-C: no permissions store + no enforcement.)
    const agents = [];

    // Notifications (HELD-C: no prefs store.)
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
