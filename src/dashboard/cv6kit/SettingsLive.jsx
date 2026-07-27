import { useState, useEffect, useCallback, useMemo } from 'react';
import { SettingsView, accountName, accountEmail, accountInitial } from './SettingsView';
import { CvgDesktopChrome } from './CvgDesktopChrome';
import { authFetch } from '../lib/authFetch';
import { supabase } from '../lib/supabase';

/**
 * SettingsLive — wires the CV6 Settings screen (SettingsView) to REAL data:
 *  - user: current auth user from supabase.auth.user(). NOTE the real shape —
 *    the display name is on user_metadata.full_name, not full_name — which is why
 *    every profile row goes through accountName/accountEmail/accountInitial rather
 *    than reading user.full_name directly. Whoever is signed in is who renders:
 *    Ash sees Ash, Courtney sees Courtney, and an unresolved session shows a
 *    neutral placeholder, never another person's name or address.
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
  onNav,                 // Callback: for CvgDesktopChrome (desktop only)
  agents: agentsProp = [], // Real agents from CornerVG
  isDesktop = false,     // true = render desktop 2-column layout
}) {
  // Desktop-only: track active section in the left nav
  const [activeSection, setActiveSection] = useState('env');

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

  // Desktop 2-column layout: left nav (236px) + right content pane
  if (isDesktop) {
    const SECTIONS_DESKTOP = [
      { id: 'env', label: 'Environment', icon: 'env', title: 'Environment', sub: 'Everything your agents can see and act on. This is the master surface.' },
      { id: 'agents', label: 'Agents & permissions', icon: 'agents', title: 'Agents & permissions', sub: 'What each agent may do on its own, and what needs your nod.' },
      { id: 'notify', label: 'Notifications', icon: 'notify', title: 'Notifications', sub: 'When and how Corner reaches you about agent work.' },
      { id: 'appear', label: 'Appearance', icon: 'appear', title: 'Appearance', sub: 'Three co-equal themes. Switch whenever you like.' },
      { id: 'profile', label: 'Profile', icon: 'profile', title: 'Profile', sub: 'Your account and workspace.' },
      { id: 'setup', label: 'Re-run setup', icon: 'setup', title: 'Re-run setup', sub: 'Walk through onboarding again.' }
    ];

    const ICONS = {
      env: (color = 'currentColor') => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 2 7l10 5 10-5Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      ),
      agents: (color = 'currentColor') => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
        </svg>
      ),
      notify: (color = 'currentColor') => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>
        </svg>
      ),
      appear: (color = 'currentColor') => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18Z"/>
        </svg>
      ),
      profile: (color = 'currentColor') => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>
        </svg>
      ),
      setup: (color = 'currentColor') => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.2-8.6"/><path d="M21 3v6h-6"/>
        </svg>
      ),
    };

    const activeSecData = SECTIONS_DESKTOP.find((s) => s.id === activeSection) || SECTIONS_DESKTOP[0];

    // Reuse SectionContent rendering from SettingsView — pass all real handlers
    const DesktopSectionContent = ({ sectionId }) => {
      const INTEGRATIONS = [
        {
          name: 'Email',
          desc: 'Read & draft replies',
          tint: 'rgba(244,114,182,.16)',
          icon: (w = '19') => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="var(--pink-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4Z"/><path d="m4 7 8 6 8-6"/></svg>
        },
        {
          name: 'GitHub',
          desc: 'Repos & pull requests',
          tint: 'rgba(139,124,246,.16)',
          icon: (w = '19') => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="var(--violet-400)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6 0C6.7 2.3 5.6 2.6 5.6 2.6a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>
        },
        {
          name: 'Calendar',
          desc: 'Schedule & meetings',
          tint: 'var(--accent-weak)',
          icon: (w = '18') => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
        },
        {
          name: 'Slack',
          desc: 'Team messages',
          tint: 'rgba(52,211,153,.16)',
          icon: (w = '18') => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/></svg>
        },
        {
          name: 'Drive',
          desc: 'Files & documents',
          tint: 'rgba(251,191,36,.16)',
          icon: (w = '18') => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
        }
      ];

      const THEMES = [
        { k: 'dark', label: 'Dark' },
        { k: 'light', label: 'Light' },
        { k: 'glass', label: 'Glass' }
      ];

      const NOTIFY_OPTIONS = [
        { k: 'needsYou', t: 'Something needs you', d: 'A decision only you can make' },
        { k: 'blocked', t: 'A goal is blocked', d: 'An agent stopped and is waiting' },
        { k: 'agentDone', t: 'An agent finished', d: 'A goal or step completed' },
        { k: 'digest', t: 'Daily digest', d: 'A morning summary of overnight work' },
        { k: 'quiet', t: 'Quiet hours', d: 'Hold non-urgent pings 9pm to 8am' }
      ];

      function Toggle({ on, onChange }) {
        return (
          <button
            onClick={() => onChange?.(!on)}
            style={{
              width: 42,
              height: 24,
              borderRadius: 12,
              background: on ? 'var(--accent)' : 'var(--surface-2)',
              border: `1px solid ${on ? 'transparent' : 'var(--hair)'}`,
              position: 'relative',
              cursor: 'pointer',
              flex: 'none',
              padding: 0,
              fontFamily: 'inherit'
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: on ? 20 : 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: on ? 'var(--paper-0)' : 'var(--faint)',
                transition: 'left .15s, background .15s',
                pointerEvents: 'none'
              }}
            />
          </button>
        );
      }

      function LockIcon(color = 'var(--muted)') {
        return (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
          </svg>
        );
      }

      function PeopleIcon(color = 'var(--accent)', w = '13') {
        return (
          <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5.2"/>
          </svg>
        );
      }

      function CheckIcon() {
        return (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4L19 7"/>
          </svg>
        );
      }

      function RefreshIcon(color = 'var(--accent)') {
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.2-8.6"/><path d="M21 3v6h-6"/>
          </svg>
        );
      }

      // Inline row styling for desktop
      const rowStyle = { display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderBottom: '1px solid var(--divider)' };
      const icoStyle = { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' };
      const nmStyle = { fontSize: 14, fontWeight: 600, color: 'var(--fg)' };
      const dsStyle = { fontSize: 11.5, color: 'var(--muted)', marginTop: 2 };

      if (sectionId === 'env') {
        return (
          <div>
            <div style={{ display: 'flex', gap: 11, padding: '13px 15px', border: '1px solid var(--accent-weak)', background: 'var(--accent-weak)', borderRadius: 13, marginBottom: 24, fontSize: '12.5px', lineHeight: 1.5, color: 'var(--fg)' }}>
              {PeopleIcon('var(--accent)', '18')}
              <div>
                <strong>Connections are shared with everyone in a shared room</strong>. Scope each one to control which rooms, and which people, can reach it.
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Connections</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, marginBottom: 32, overflow: 'hidden' }}>
              {INTEGRATIONS.map((int, idx) => {
                const isConnected = connections?.[int.name];
                const isPrivate = scope?.[int.name] === 'Private';
                return (
                  <div key={int.name}>
                    <div style={{ ...rowStyle, borderBottom: idx < INTEGRATIONS.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                      <span style={{ ...icoStyle, background: int.tint }}>
                        {int.icon('18')}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={nmStyle}>{int.name}</div>
                        <div style={dsStyle}>{int.desc}</div>
                      </div>
                      {!isConnected ? (
                        <button onClick={() => handleConnect(int.name)} style={{ marginLeft: 'auto', height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>
                          Connect
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flex: 'none' }}>
                          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', borderRadius: 9, border: `1px solid ${isPrivate ? 'var(--hair)' : 'var(--accent-weak)'}`, background: isPrivate ? 'var(--surface-2)' : 'var(--accent-weak)', color: isPrivate ? 'var(--muted)' : 'var(--accent)', fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'default' }}>
                            {isPrivate && LockIcon(isPrivate ? 'var(--muted)' : 'var(--accent)')}
                            {!isPrivate && PeopleIcon('var(--accent)', '13')}
                            {scope?.[int.name] || 'All rooms'}
                          </button>
                          <button onClick={() => handleDisconnect(int.name)} style={{ height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      if (sectionId === 'agents') {
        return (
          <div>
            {agents?.map((agent) => (
              <div key={agent.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: agent.toneBg, color: agent.tone, fontSize: 12, fontWeight: 700, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {agent.initials}
                  </span>
                  <div>
                    <div style={nmStyle}>{agent.id}</div>
                    <div style={dsStyle}>{agent.role}</div>
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, marginBottom: 28, overflow: 'hidden' }}>
                  {['Draft', 'Send', 'Commit', 'File'].map((perm, idx, perms) => (
                    <div key={perm} style={{ ...rowStyle, borderBottom: idx < perms.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={nmStyle}>{perm}</div>
                        <div style={dsStyle}>
                          {perm === 'Draft' && 'Write replies & docs for you'}
                          {perm === 'Send' && 'Send on your behalf without asking'}
                          {perm === 'Commit' && 'Push code changes'}
                          {perm === 'File' && 'Move & organize files'}
                        </div>
                      </div>
                      <Toggle on={permissions?.[agent.id]?.[perm]} onChange={(on) => handleTogglePerm(agent.id, perm)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }

      if (sectionId === 'notify') {
        return (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
            {NOTIFY_OPTIONS.map((opt, idx) => (
              <div key={opt.k} style={{ ...rowStyle, borderBottom: idx < NOTIFY_OPTIONS.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={nmStyle}>{opt.t}</div>
                  <div style={dsStyle}>{opt.d}</div>
                </div>
                <Toggle on={notifySettings?.[opt.k]} onChange={(on) => handleToggleNotify(opt.k)} />
              </div>
            ))}
          </div>
        );
      }

      if (sectionId === 'appear') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {THEMES.map((t) => {
              const isSelected = theme === t.k;
              let bgColor, c1, c2;
              if (t.k === 'dark') {
                bgColor = 'var(--ground)';
                c1 = 'var(--surface)';
                c2 = 'var(--accent)';
              } else if (t.k === 'light') {
                bgColor = 'var(--ground)';
                c1 = 'var(--surface)';
                c2 = 'var(--accent)';
              } else {
                bgColor = 'var(--ground)';
                c1 = 'var(--surface)';
                c2 = 'var(--accent)';
              }
              return (
                <button
                  key={t.k}
                  onClick={() => onThemeChange(t.k)}
                  style={{
                    border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--hair)'}`,
                    borderRadius: 16,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'transparent',
                    padding: 0,
                    fontFamily: 'inherit'
                  }}
                >
                  <div style={{ height: 84, padding: 12, display: 'flex', flexDirection: 'column', gap: 7, background: bgColor }}>
                    <div style={{ height: 9, borderRadius: 3, width: '60%', background: c1 }} />
                    <div style={{ height: 9, borderRadius: 3, width: '85%', background: c1 }} />
                    <div style={{ height: 9, borderRadius: 3, width: '40%', background: c2 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderTop: '1px solid var(--divider)', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                    {t.label}
                    {isSelected && (
                      <span style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {CheckIcon()}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      }

      if (sectionId === 'profile') {
        return (
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, marginBottom: 18, overflow: 'hidden' }}>
              <div style={rowStyle}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--avatar,var(--accent))', color: '#fff', fontSize: 17, fontWeight: 700, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {accountInitial(user)}
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{accountName(user)}</div>
                  {accountEmail(user) ? <div style={dsStyle}>{accountEmail(user)}</div> : null}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
              <button onClick={() => onSignOut()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', cursor: 'pointer', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: 'var(--warn)', fontFamily: 'var(--font-sans)' }}>
                Sign out
              </button>
            </div>
          </div>
        );
      }

      if (sectionId === 'setup') {
        return (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={rowStyle}>
              <span style={{ ...icoStyle, background: 'var(--accent-weak)' }}>
                {RefreshIcon('var(--accent)')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={nmStyle}>Re-run setup</div>
                <div style={dsStyle}>Reconnect services, agents, theme and a first goal.</div>
              </div>
              <button onClick={() => onRerunSetup()} style={{ marginLeft: 'auto', height: 32, padding: '0 13px', borderRadius: 9, border: 'none', background: 'var(--success)', color: 'var(--paper-0)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>
                Start
              </button>
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <div data-cv6kit data-theme={theme} style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
        <CvgDesktopChrome activeTool="settings" onNav={onNav} user={{ initial: accountInitial(user) }} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <div style={{ width: 236, flex: 'none', borderRight: '1px solid var(--divider)', padding: '18px 14px', overflowY: 'auto' }}>
            {SECTIONS_DESKTOP.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  height: 42,
                  padding: '0 12px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeSection === s.id ? 'var(--accent-weak)' : 'transparent',
                  color: activeSection === s.id ? 'var(--accent)' : 'var(--muted)',
                  fontSize: 13.5,
                  fontWeight: activeSection === s.id ? 600 : 500,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all .15s'
                }}
              >
                {ICONS[s.icon]?.()}
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 'none', padding: '24px 30px 16px', borderBottom: '1px solid var(--divider)' }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)' }}>
                {activeSecData.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
                {activeSecData.sub}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 30px' }}>
              <DesktopSectionContent sectionId={activeSection} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile fallback: original list-to-detail drill-down (unchanged)
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
      onBack={onBack}
      onSignOut={onSignOut}
    />
  );
}
