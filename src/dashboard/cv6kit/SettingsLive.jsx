import { useState, useEffect, useCallback, useMemo } from 'react';
import { SettingsView } from './SettingsView';
import { authFetch } from '../lib/authFetch';
import { supabase } from '../lib/supabase';

/**
 * SettingsLive — wires the CV6 Settings screen (SettingsView) to REAL data:
 *  - user: current auth user (full_name, email) from supabase.auth.user()
 *  - theme: passed by integrator; onThemeChange updates it live
 *  - connections: GET /api/integrations/list (slug -> connected status)
 *  - scope: connection visibility scope (read-only for now; UI shows 'All rooms' | 'Private')
 *  - agents: placeholder agents (agents list is not yet persisted; use defaults)
 *  - permissions: placeholder permissions (per-agent perms not yet persisted; use defaults)
 *  - notifySettings: placeholder notifications (notification prefs not yet persisted; use defaults)
 *
 * Real wiring:
 *  - onConnect: triggers OAuth flow via /api/integrations/oauth/start?slug=...
 *  - onDisconnect: calls /api/integrations/disconnect (POST)
 *  - onCycleScope: read-only UI (scope cycling not yet implemented)
 *  - onTogglePerm: no-op (agent permissions not yet persisted)
 *  - onToggleNotify: no-op (notification prefs not yet persisted)
 *  - onSignOut: calls supabase.auth.signOut() (real callback prop from integrator)
 *  - onThemeChange: applies theme live via callback (real, handled by integrator)
 *  - onRerunSetup: navigates to onboarding (callback from integrator)
 *
 * Poll interval: 30s for integrations list.
 */

export function SettingsLive({
  user,                  // Real user from CornerVG: { full_name, email }
  theme,                 // Real theme from CornerVG: 'dark' | 'light' | 'glass'
  onThemeChange,         // Real callback to apply theme change live
  onSignOut,             // Real callback: calls supabase.auth.signOut()
  onRerunSetup,          // Real callback: navigate to onboarding
  worldId = 'aom',
  onBack,                // Callback: return to home
  agents: agentsProp = [], // Real agents from CornerVG
}) {
  // Real integrations: fetch from /api/integrations/list
  const [connections, setConnections] = useState({});
  const [scope, setScope] = useState({});
  const [loading, setLoading] = useState(true);

  const loadIntegrations = useCallback(async () => {
    try {
      const res = await authFetch('/api/integrations/list');
      if (!res || !res.ok) {
        setConnections({});
        setScope({});
        return;
      }
      const data = await res.json();
      if (data?.integrations && Array.isArray(data.integrations)) {
        // Map API response { slug, status, ... } to SettingsView's
        // connections { [name]: boolean } format.
        // Integration name map: slug -> display name (Email, GitHub, Calendar, Slack, Drive)
        const nameMap = {
          'gmail': 'Email',
          'github': 'GitHub',
          'google-calendar': 'Calendar',
          'slack': 'Slack',
          'google-drive': 'Drive',
        };

        const connectedMap = {};
        const scopeMap = {};
        data.integrations.forEach((int) => {
          const name = nameMap[int.slug] || int.name;
          connectedMap[name] = int.status === 'connected';
          // Scope defaults to 'All rooms' if connected, not persisted yet
          // so scope cycling is a read-only UI element for now.
          scopeMap[name] = int.status === 'connected' ? 'All rooms' : null;
        });
        setConnections(connectedMap);
        setScope(scopeMap);
      } else {
        setConnections({});
        setScope({});
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
      setConnections({});
      setScope({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Load integrations on mount and poll every 30s
  useEffect(() => {
    loadIntegrations();
    const t = setInterval(loadIntegrations, 30000);
    return () => clearInterval(t);
  }, [loadIntegrations]);

  // REAL agents from CornerVG, mapped to the SettingsView shape.
  const AGENT_TONES = [
    { tone: 'var(--success)', toneBg: 'rgba(52,211,153,.2)' },
    { tone: '#A3E635', toneBg: 'rgba(163,230,53,.2)' },
    { tone: 'var(--accent)', toneBg: 'var(--accent-weak)' },
    { tone: '#C792FF', toneBg: 'rgba(168,85,247,.2)' },
  ];
  const agents = useMemo(() => (agentsProp || [])
    .filter((a) => a && (a.name || a.slug))
    .slice(0, 8)
    .map((a, i) => ({
      id: a.name || a.slug,
      initials: (String(a.name || a.slug).replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase()) || 'A',
      role: a.role || a.title || 'Agent',
      ...AGENT_TONES[i % AGENT_TONES.length],
    })), [agentsProp]);

  // REAL per-agent permissions + notification prefs, persisted via /api/dashboard/preferences
  // (user_preferences table, keyed by key + client). Off-by-default is the safe state:
  // anything not granted means the agent asks first.
  const [permissions, setPermissions] = useState({});
  const [notifySettings, setNotifySettings] = useState({ needsYou: true, blocked: true, agentDone: true, digest: true, quiet: false });

  useEffect(() => {
    let alive = true;
    authFetch(`/api/dashboard/preferences?key=cv6_agent_permissions&client=${encodeURIComponent(worldId)}`)
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.value && typeof d.value === 'object') setPermissions(d.value); })
      .catch(() => {});
    authFetch(`/api/dashboard/preferences?key=cv6_notify_prefs&client=${encodeURIComponent(worldId)}`)
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.value && typeof d.value === 'object') setNotifySettings((v) => ({ ...v, ...d.value })); })
      .catch(() => {});
    return () => { alive = false; };
  }, [worldId]);

  const savePref = useCallback((key, value) => {
    authFetch('/api/dashboard/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, client_id: worldId, value }),
    }).catch(() => {});
  }, [worldId]);

  // Real: OAuth connect flow
  const handleConnect = useCallback((name) => {
    // Map display name back to slug for the API
    const slugMap = {
      'Email': 'gmail',
      'GitHub': 'github',
      'Calendar': 'google-calendar',
      'Slack': 'slack',
      'Drive': 'google-drive',
    };
    const slug = slugMap[name];
    if (!slug) return;

    // OAuth integrations: redirect to the auth flow
    authFetch(`/api/integrations/oauth/start?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => {
        if (data?.authUrl) {
          window.location.href = data.authUrl;
        }
      })
      .catch(() => {
        // Fallback: direct request (in case fetch fails, try the raw endpoint)
        window.location.href = `/api/integrations/oauth/start?slug=${encodeURIComponent(slug)}`;
      });
  }, []);

  // Real: disconnect flow
  const handleDisconnect = useCallback((name) => {
    const slugMap = {
      'Email': 'gmail',
      'GitHub': 'github',
      'Calendar': 'google-calendar',
      'Slack': 'slack',
      'Drive': 'google-drive',
    };
    const slug = slugMap[name];
    if (!slug) return;

    authFetch('/api/integrations/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
      .then(() => {
        // Reload integrations list after disconnect
        loadIntegrations();
      })
      .catch((err) => {
        console.error('Failed to disconnect:', err);
      });
  }, [loadIntegrations]);

  // No-op stubs: these actions are not yet implemented on the backend
  const handleCycleScope = useCallback(() => {
    // Scope cycling not yet implemented; read-only UI
  }, []);

  const handleEditConnection = useCallback(() => {
    // Edit mode for connection details not yet implemented
  }, []);

  const handleReconnect = useCallback((name) => {
    // Reconnect same as initial connect; re-runs OAuth flow
    handleConnect(name);
  }, [handleConnect]);

  // REAL: toggle a per-agent permission, persist to user_preferences.
  const handleTogglePerm = useCallback((agentId, perm) => {
    setPermissions((prev) => {
      const cur = prev[agentId] || {};
      const next = { ...prev, [agentId]: { ...cur, [perm]: !cur[perm] } };
      savePref('cv6_agent_permissions', next);
      return next;
    });
  }, [savePref]);

  // REAL: toggle a notification preference, persist to user_preferences.
  const handleToggleNotify = useCallback((key) => {
    setNotifySettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      savePref('cv6_notify_prefs', next);
      return next;
    });
  }, [savePref]);

  const handleRotateKeys = useCallback(() => {
    // API key rotation not yet implemented
  }, []);

  return (
    <SettingsView
      live
      theme={theme}
      user={user}
      agents={agents}
      connections={connections}
      scope={scope}
      permissions={permissions}
      notifySettings={notifySettings}
      onThemeChange={onThemeChange}
      onConnect={handleConnect}
      onCycleScope={handleCycleScope}
      onEditConnection={handleEditConnection}
      onReconnect={handleReconnect}
      onDisconnect={handleDisconnect}
      onTogglePerm={handleTogglePerm}
      onToggleNotify={handleToggleNotify}
      onRotateKeys={handleRotateKeys}
      onRerunSetup={onRerunSetup}
      onSignOut={onSignOut}
    />
  );
}
