import React, { useState } from 'react';

/**
 * CV6 kit Settings — the master Environment surface with connections, agents & permissions,
 * notifications, appearance, profile, and re-run setup. Mobile view only (single-column list
 * that expands into detail sections).
 *
 * Design: ui_kits/settings/index.html (mobile frame)
 * Props shaped for real data but fed sample data for now:
 *   theme = 'dark' | 'light' | 'glass'
 *   user = { full_name, email }
 *   agents = [ { id, role, initials, tone, toneBg }, ... ]
 *   connections = { Email, GitHub, Calendar, Slack, Drive } (boolean connected state)
 *   scope = { Email, GitHub, ... } (string scope: 'All rooms', '2 rooms', 'Private', etc.)
 *   permissions = { [agentId]: { Draft, Send, Commit, File: boolean }, ... }
 *   notifications = { needsYou, blocked, agentDone, digest, quiet: boolean }
 *   onThemeChange(theme), onBackToSettings(), onConnect(name), onCycleScope(name),
 *   onEditConnection(name), onTogglePerm(agentId, permKey), onToggleNotify(notifyKey)
 */

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
  back: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  ),
  forward: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  ),
};

const SECTIONS = [
  { id: 'env', label: 'Environment', icon: 'env', title: 'Environment', sub: 'Everything your agents can see and act on. This is the master surface.' },
  { id: 'agents', label: 'Agents & permissions', icon: 'agents', title: 'Agents & permissions', sub: 'What each agent may do on its own, and what needs your nod.' },
  { id: 'notify', label: 'Notifications', icon: 'notify', title: 'Notifications', sub: 'When and how Corner reaches you about agent work.' },
  { id: 'appear', label: 'Appearance', icon: 'appear', title: 'Appearance', sub: 'Three co-equal themes. Switch whenever you like.' },
  { id: 'profile', label: 'Profile', icon: 'profile', title: 'Profile', sub: 'Your account and workspace.' },
  { id: 'setup', label: 'Re-run setup', icon: 'setup', title: 'Re-run setup', sub: 'Walk through onboarding again.' }
];

const INTEGRATIONS = [
  { name: 'Email', desc: 'Read & draft replies', tint: 'rgba(244,114,182,.16)', color: '#f472b6' },
  { name: 'GitHub', desc: 'Repos & pull requests', tint: 'rgba(139,124,246,.16)', color: '#8b7cf6' },
  { name: 'Calendar', desc: 'Schedule & meetings', tint: 'var(--accent-weak)', color: 'var(--accent)' },
  { name: 'Slack', desc: 'Team messages', tint: 'rgba(52,211,153,.16)', color: 'var(--success)' },
  { name: 'Drive', desc: 'Files & documents', tint: 'rgba(251,191,36,.16)', color: 'var(--warn)' }
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
      onClick={() => onChange(!on)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 12,
        background: on ? 'var(--accent)' : 'var(--surface-2)',
        border: '1px solid ' + (on ? 'transparent' : 'var(--hair)'),
        position: 'relative',
        cursor: 'pointer',
        flex: 'none'
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
          background: on ? '#fff' : 'var(--faint)',
          transition: 'left .15s, background .15s'
        }}
      />
    </button>
  );
}

function connectionIcon(name) {
  const icons = {
    Email: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.8"><path d="M4 6h16v12H4Z"/><path d="m4 7 8 6 8-6"/></svg>,
    GitHub: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#8b7cf6" strokeWidth="1.7"><path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6 0C6.7 2.3 5.6 2.6 5.6 2.6a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>,
    Calendar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>,
    Slack: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.8"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/></svg>,
    Drive: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>,
  };
  return icons[name];
}

function SectionContent({ sectionId, user, agents, connections, scope, permissions, notifications, theme, onConnect, onCycleScope, onEditConnection, editingConn, onTogglePerm, onToggleNotify, onThemeChange }) {
  if (sectionId === 'env') {
    return (
      <div>
        {/* awareness banner */}
        <div style={{ display: 'flex', gap: 11, padding: '13px 14px', border: '1px solid var(--accent-weak)', background: 'var(--accent-weak)', borderRadius: 13, marginBottom: 20, fontSize: 12.5, lineHeight: 1.5, color: 'var(--fg)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" style={{ flex: 'none', marginTop: 2 }}>
            <circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5.2"/>
          </svg>
          <div><strong>Connections are shared with everyone in a shared room</strong>. Scope each one to control which rooms, and which people, can reach it.</div>
        </div>

        {/* connections */}
        <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Connections</div>
        <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, marginBottom: 22, overflow: 'hidden' }}>
          {INTEGRATIONS.map((int, i) => {
            const isConnected = connections[int.name];
            return (
              <div key={int.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderBottom: i < INTEGRATIONS.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: int.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    {connectionIcon(int.name)}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{int.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{int.desc}</div>
                  </div>
                  {!isConnected ? (
                    <button onClick={() => onConnect(int.name)} style={{ marginLeft: 'auto', height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>
                      Connect
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flex: 'none' }}>
                      <button onClick={() => onCycleScope(int.name)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', borderRadius: 9, border: '1px solid ' + (scope[int.name] === 'Private' ? 'var(--hair)' : 'var(--accent-weak)'), background: scope[int.name] === 'Private' ? 'var(--surface-2)' : 'var(--accent-weak)', color: scope[int.name] === 'Private' ? 'var(--muted)' : 'var(--accent)', fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        {scope[int.name]}
                      </button>
                      <button onClick={() => onEditConnection(int.name)} style={{ height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        {editingConn === int.name ? 'Done' : 'Edit'}
                      </button>
                    </div>
                  )}
                </div>
                {editingConn === int.name && isConnected && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--divider)', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>Account</span>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg)' }}>patrik@corner.so</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>Visible in</span>
                      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', borderRadius: 9, border: '1px solid var(--accent-weak)', background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        {scope[int.name]}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ flex: 1, height: 32, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        Reconnect
                      </button>
                      <button style={{ flex: 1, height: 32, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: '#F87171', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* secrets & keys */}
        <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Secrets & keys</div>
        <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px' }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8">
                <path d="M12 2a5 5 0 0 0-5 5c0 1 .2 1.7.5 2.4L3 14v3h3l1-1h2l1-1v-2l1.5-1.5A5 5 0 1 0 12 2Z"/><circle cx="15" cy="7" r="1"/>
              </svg>
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>API keys</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>3 stored · last rotated 12d ago</div>
            </div>
            <button style={{ marginLeft: 'auto', height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>
              Edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sectionId === 'agents') {
    return (
      <div>
        {agents.map((agent, ai) => (
          <div key={agent.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 11 }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: agent.toneBg, color: agent.tone, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {agent.initials}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{agent.id}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{agent.role}</div>
              </div>
            </div>
            <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, marginBottom: 22, overflow: 'hidden' }}>
              {['Draft', 'Send', 'Commit', 'File'].map((perm, pi, perms) => (
                <div key={perm} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderBottom: pi < perms.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{perm}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {perm === 'Draft' && 'Write replies & docs for you'}
                      {perm === 'Send' && 'Send on your behalf without asking'}
                      {perm === 'Commit' && 'Push code changes'}
                      {perm === 'File' && 'Move & organize files'}
                    </div>
                  </div>
                  <Toggle on={permissions[agent.id]?.[perm]} onChange={(on) => onTogglePerm(agent.id, perm)} />
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
      <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
        {NOTIFY_OPTIONS.map((opt, i) => (
          <div key={opt.k} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderBottom: i < NOTIFY_OPTIONS.length - 1 ? '1px solid var(--divider)' : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{opt.t}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{opt.d}</div>
            </div>
            <Toggle on={notifications[opt.k]} onChange={(on) => onToggleNotify(opt.k)} />
          </div>
        ))}
      </div>
    );
  }

  if (sectionId === 'appear') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {THEMES.map((t) => (
          <button
            key={t.k}
            onClick={() => onThemeChange(t.k)}
            style={{
              border: '2px solid ' + (theme === t.k ? 'var(--accent)' : 'var(--hair)'),
              borderRadius: 16,
              overflow: 'hidden',
              cursor: 'pointer',
              background: 'transparent'
            }}
          >
            <div style={{ height: 84, padding: 12, display: 'flex', flexDirection: 'column', gap: 7, background: t.k === 'dark' ? '#0A0A0B' : t.k === 'light' ? '#F6F6F7' : 'linear-gradient(140deg,#0c1a22,#1a1224)' }}>
              <div style={{ height: 9, borderRadius: 3, width: '60%', background: t.k === 'dark' ? '#2A2F37' : t.k === 'light' ? '#E2E0DB' : 'rgba(255,255,255,.18)' }} />
              <div style={{ height: 9, borderRadius: 3, width: '85%', background: t.k === 'dark' ? '#2A2F37' : t.k === 'light' ? '#E2E0DB' : 'rgba(255,255,255,.18)' }} />
              <div style={{ height: 9, borderRadius: 3, width: '40%', background: t.k === 'dark' ? '#3B82F6' : t.k === 'light' ? '#0066FF' : '#5B9BFF' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderTop: '1px solid var(--divider)', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
              {t.label}
              {theme === t.k && (
                <span style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <path d="m5 12 4 4L19 7"/>
                  </svg>
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (sectionId === 'profile') {
    return (
      <div>
        <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, marginBottom: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px' }}>
            <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--avatar)', color: '#fff', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              {user?.full_name?.[0] || 'P'}
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{user?.full_name || 'Patrik'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{user?.email || 'patrik@corner.so'}</div>
            </div>
            <button style={{ marginLeft: 'auto', height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
              Edit
            </button>
          </div>
        </div>

        <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Workspace</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Corner · 8 seats</div>
            </div>
            <button style={{ height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', marginLeft: 'auto' }}>
              Manage
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', cursor: 'pointer' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#F87171' }}>Sign out</div>
          </div>
        </div>
      </div>
    );
  }

  if (sectionId === 'setup') {
    return (
      <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px' }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.2-8.6"/><path d="M21 3v6h-6"/>
            </svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Re-run setup</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Reconnect services, agents, theme and a first goal.</div>
          </div>
          <a href="../onboarding/index.html" style={{ marginLeft: 'auto', height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid transparent', background: 'var(--success)', color: '#fff', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Start
          </a>
        </div>
      </div>
    );
  }

  return null;
}

export function SettingsView({
  theme = 'dark',
  user = { full_name: 'Patrik', email: 'patrik@corner.so' },
  agents = [
    { id: 'Elon', initials: 'EL', role: 'Engineering · drives missions', tone: 'var(--success)', toneBg: 'rgba(52,211,153,.2)' },
    { id: 'Rex', initials: 'RX', role: 'Writing · drafts & digests', tone: '#A3E635', toneBg: 'rgba(163,230,53,.2)' }
  ],
  connections = { Email: true, GitHub: true, Calendar: false, Slack: false, Drive: true },
  scope = { Email: 'All rooms', GitHub: '2 rooms', Calendar: 'All rooms', Slack: 'Private', Drive: 'All rooms' },
  permissions = { Elon: { Draft: true, Send: false, Commit: true, File: true }, Rex: { Draft: true, Send: false, Commit: false, File: true } },
  notifications = { needsYou: true, blocked: true, agentDone: true, digest: true, quiet: false },
  onThemeChange = () => {},
  onConnect = () => {},
  onCycleScope = () => {},
  onEditConnection = () => {},
  onTogglePerm = () => {},
  onToggleNotify = () => {},
  onBackToList = () => {}
}) {
  const [section, setSection] = useState('env');
  const [editingConn, setEditingConn] = useState(null);

  const curSection = SECTIONS.find(s => s.id === section) || SECTIONS[0];

  return (
    <div data-cv6kit data-theme={theme} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      {/* header — safe-area top */}
      <div style={{ flex: 'none', height: 56, display: 'flex', alignItems: 'center', gap: 11, padding: '0 14px', borderBottom: '1px solid var(--divider)' }}>
        <button onClick={() => { setSection(null); onBackToList?.(); }} aria-label="Back" style={{ width: 34, height: 34, marginLeft: -8, flex: 'none', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {ICONS.back()}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{curSection.title}</div>
        </div>
      </div>

      {section === null ? (
        // List view
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '6px 4px 20px' }}>
            <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--avatar)', color: '#fff', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              {user?.full_name?.[0] || 'P'}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>{user?.full_name || 'Patrik'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{user?.email || 'patrik@corner.so'}</div>
            </div>
          </div>

          <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
            {SECTIONS.map((s, i) => (
              <div
                key={s.id}
                onClick={() => setSection(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  height: 'auto',
                  padding: 14,
                  borderBottom: i < SECTIONS.length - 1 ? '1px solid var(--divider)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--chip)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ICONS[s.icon]?.()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)' }}>{s.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.35, marginTop: 2 }}>{s.sub}</div>
                </div>
                {ICONS.forward()}
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Detail view
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 18 }}>{curSection.sub}</div>
          <SectionContent
            sectionId={section}
            user={user}
            agents={agents}
            connections={connections}
            scope={scope}
            permissions={permissions}
            notifications={notifications}
            theme={theme}
            onConnect={onConnect}
            onCycleScope={onCycleScope}
            onEditConnection={(name) => {
              setEditingConn(editingConn === name ? null : name);
              onEditConnection?.(name);
            }}
            editingConn={editingConn}
            onTogglePerm={onTogglePerm}
            onToggleNotify={onToggleNotify}
            onThemeChange={onThemeChange}
          />
        </div>
      )}
    </div>
  );
}
