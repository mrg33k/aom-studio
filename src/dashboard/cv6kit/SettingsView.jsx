import React, { useState } from 'react';

/**
 * CV6 kit Settings — mobile master Environment surface with connections, agents & permissions,
 * notifications, appearance, profile, and re-run setup. Full-width list-to-detail drill-down.
 *
 * Design: /corner/missions/corner-ui-cv6/deliverables/design-system-2026-06-21/ui_kits/settings/index.html (mobile)
 *
 * Props (all required for real wiring; defaults provided for CV6KitTest sample preview):
 *   theme: 'dark' | 'light' | 'glass' — the active theme
 *   user: { full_name, email }
 *   agents: [ { id, role, initials, toneBg }, ... ] — agents + their autonomy toggles
 *   connections: { [name]: boolean } — Email, GitHub, Calendar, Slack, Drive connect state
 *   scope: { [name]: string } — 'All rooms' | 'N rooms' | 'Private' per connection
 *   permissions: { [agentId]: { Draft, Send, Commit, File: boolean }, ... }
 *   notifySettings: { needsYou, blocked, agentDone, digest, quiet: boolean }
 *   onThemeChange(theme) — apply live
 *   onConnect(name) — toggle connection (real backend)
 *   onCycleScope(name) — rotate scope button (real backend)
 *   onTogglePerm(agentId, permKey) — toggle agent permission (real backend)
 *   onToggleNotify(key) — toggle notification setting (real backend)
 *   onRerunSetup() — re-enter Onboarding (real callback)
 *   onSignOut() — sign out (sensitive; real callback, no fake UI)
 * For edit/reconnect/disconnect: these are NOT faked; call prop functions.
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
  back: (color = 'currentColor') => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  ),
  forward: (color = 'currentColor') => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

// Integration configs match design system icons
const INTEGRATIONS = [
  {
    name: 'Email',
    desc: 'Read & draft replies',
    tint: 'rgba(244,114,182,.16)',
    icon: (w = '19') => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4Z"/><path d="m4 7 8 6 8-6"/></svg>
  },
  {
    name: 'GitHub',
    desc: 'Repos & pull requests',
    tint: 'rgba(139,124,246,.16)',
    icon: (w = '19') => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="#8b7cf6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6 0C6.7 2.3 5.6 2.6 5.6 2.6a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>
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

// SVGs used across sections
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

function FolderIcon(color = 'var(--fg)') {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>
    </svg>
  );
}

function KeyIcon(color = 'var(--warn)') {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 0 0-5 5c0 1 .2 1.7.5 2.4L3 14v3h3l1-1h2l1-1v-2l1.5-1.5A5 5 0 1 0 12 2Z"/><circle cx="15" cy="7" r="1"/>
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

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 4 4L19 7"/>
    </svg>
  );
}

// Toggle switch component
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
          background: on ? '#fff' : 'var(--faint)',
          transition: 'left .15s, background .15s',
          pointerEvents: 'none'
        }}
      />
    </button>
  );
}

// Content renderer for each settings section
function SectionContent({ sectionId, user, agents, connections, scope, permissions, notifySettings, theme, onConnect, onCycleScope, onEditConnection, editingConn, onTogglePerm, onToggleNotify, onThemeChange, onReconnect, onDisconnect, onRotateKeys, onRerunSetup, onSignOut }) {
  if (sectionId === 'env') {
    return (
      <div>
        {/* Shared rooms awareness banner */}
        <div style={{ display: 'flex', gap: 11, padding: '13px 14px', border: '1px solid var(--accent-weak)', background: 'var(--accent-weak)', borderRadius: 13, marginBottom: 20 }}>
          {PeopleIcon('var(--accent)', '18')}
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--fg)' }}>
            <strong>Connections are shared with everyone in a shared room</strong>. Scope each one to control which rooms, and which people, can reach it.
          </div>
        </div>

        {/* Connections section */}
        <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Connections</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, marginBottom: 22, overflow: 'hidden' }}>
          {INTEGRATIONS.map((int, idx) => {
            const isConnected = connections?.[int.name];
            const isPrivate = scope?.[int.name] === 'Private';
            const isEditing = editingConn === int.name;
            return (
              <div key={int.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderBottom: idx < INTEGRATIONS.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: int.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    {int.icon('18')}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{int.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{int.desc}</div>
                  </div>
                  {!isConnected ? (
                    <button onClick={() => onConnect?.(int.name)} style={{ marginLeft: 'auto', height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>
                      Connect
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flex: 'none' }}>
                      <button onClick={() => onCycleScope?.(int.name)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', borderRadius: 9, border: `1px solid ${isPrivate ? 'var(--hair)' : 'var(--accent-weak)'}`, background: isPrivate ? 'var(--surface-2)' : 'var(--accent-weak)', color: isPrivate ? 'var(--muted)' : 'var(--accent)', fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        {isPrivate && LockIcon(isPrivate ? 'var(--muted)' : 'var(--accent)')}
                        {!isPrivate && PeopleIcon('var(--accent)', '13')}
                        {scope?.[int.name] || 'All rooms'}
                      </button>
                      <button onClick={() => onEditConnection?.(int.name)} style={{ height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        {isEditing ? 'Done' : 'Edit'}
                      </button>
                    </div>
                  )}
                </div>
                {isEditing && isConnected && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--divider)', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>Account</span>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg)' }}>{user?.email || 'user@corner.so'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>Visible in</span>
                      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', borderRadius: 9, border: `1px solid ${isPrivate ? 'var(--hair)' : 'var(--accent-weak)'}`, background: isPrivate ? 'var(--surface-2)' : 'var(--accent-weak)', color: isPrivate ? 'var(--muted)' : 'var(--accent)', fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        {scope?.[int.name] || 'All rooms'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => onReconnect?.(int.name)} style={{ flex: 1, height: 32, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        Reconnect
                      </button>
                      <button onClick={() => onDisconnect?.(int.name)} style={{ flex: 1, height: 32, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: '#F87171', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Secrets & keys */}
        <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Secrets & keys</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px' }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              {KeyIcon()}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>API keys</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>3 stored . last rotated 12d ago</div>
            </div>
            <button onClick={() => onRotateKeys?.()} style={{ marginLeft: 'auto', height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>
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
        {agents?.map((agent) => (
          <div key={agent.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 11 }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: agent.toneBg, color: agent.tone, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {agent.initials}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{agent.id}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{agent.role}</div>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, marginBottom: 22, overflow: 'hidden' }}>
              {['Draft', 'Send', 'Commit', 'File'].map((perm, idx, perms) => (
                <div key={perm} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderBottom: idx < perms.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{perm}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {perm === 'Draft' && 'Write replies & docs for you'}
                      {perm === 'Send' && 'Send on your behalf without asking'}
                      {perm === 'Commit' && 'Push code changes'}
                      {perm === 'File' && 'Move & organize files'}
                    </div>
                  </div>
                  <Toggle on={permissions?.[agent.id]?.[perm]} onChange={(on) => onTogglePerm?.(agent.id, perm)} />
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
          <div key={opt.k} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderBottom: idx < NOTIFY_OPTIONS.length - 1 ? '1px solid var(--divider)' : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{opt.t}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{opt.d}</div>
            </div>
            <Toggle on={notifySettings?.[opt.k]} onChange={(on) => onToggleNotify?.(opt.k)} />
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
            bgColor = '#0E1116';
            c1 = '#2A2F37';
            c2 = '#3B82F6';
          } else if (t.k === 'light') {
            bgColor = '#F5F4F1';
            c1 = '#E2E0DB';
            c2 = '#0066FF';
          } else {
            bgColor = 'linear-gradient(140deg,#0c1a22,#1a1224)';
            c1 = 'rgba(255,255,255,.18)';
            c2 = '#5B9BFF';
          }
          return (
            <button
              key={t.k}
              onClick={() => onThemeChange?.(t.k)}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px' }}>
            <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--avatar)', color: '#fff', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              {user?.full_name?.[0] || 'P'}
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{user?.full_name || 'Patrik'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{user?.email || 'patrik@corner.so'}</div>
            </div>
            <button style={{ marginLeft: 'auto', height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>
              Edit
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Workspace</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Corner . 8 seats</div>
            </div>
            <button style={{ height: 32, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', marginLeft: 'auto', flex: 'none' }}>
              Manage
            </button>
          </div>
          <button onClick={() => onSignOut?.()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', cursor: 'pointer', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#F87171', fontFamily: 'var(--font-sans)' }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (sectionId === 'setup') {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px' }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            {RefreshIcon('var(--accent)')}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Re-run setup</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Reconnect services, agents, theme and a first goal.</div>
          </div>
          <button onClick={() => onRerunSetup?.()} style={{ marginLeft: 'auto', height: 32, padding: '0 13px', borderRadius: 9, border: 'none', background: 'var(--success)', color: '#fff', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>
            Start
          </button>
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
  notifySettings = { needsYou: true, blocked: true, agentDone: true, digest: true, quiet: false },
  onThemeChange = () => {},
  onConnect = () => {},
  onCycleScope = () => {},
  onEditConnection = () => {},
  onReconnect = () => {},
  onDisconnect = () => {},
  onTogglePerm = () => {},
  onToggleNotify = () => {},
  onRotateKeys = () => {},
  onRerunSetup = () => {},
  onSignOut = () => {}
}) {
  const [section, setSection] = useState('env');
  const [editingConn, setEditingConn] = useState(null);

  const curSection = SECTIONS.find(s => s.id === section) || SECTIONS[0];

  return (
    <div data-cv6kit data-theme={theme} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      {/* header — shown only on detail view */}
      {section && (
        <div style={{ flex: 'none', height: 56, display: 'flex', alignItems: 'center', gap: 11, padding: '0 14px', borderBottom: '1px solid var(--divider)' }}>
          <button onClick={() => setSection(null)} aria-label="Back" style={{ width: 34, height: 34, marginLeft: -8, flex: 'none', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {ICONS.back()}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{curSection.title}</div>
          </div>
        </div>
      )}

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
            notifySettings={notifySettings}
            theme={theme}
            onConnect={onConnect}
            onCycleScope={onCycleScope}
            onEditConnection={(name) => {
              setEditingConn(editingConn === name ? null : name);
              onEditConnection?.(name);
            }}
            onReconnect={onReconnect}
            onDisconnect={onDisconnect}
            editingConn={editingConn}
            onTogglePerm={onTogglePerm}
            onToggleNotify={onToggleNotify}
            onThemeChange={onThemeChange}
            onRotateKeys={onRotateKeys}
            onRerunSetup={onRerunSetup}
            onSignOut={onSignOut}
          />
        </div>
      )}
    </div>
  );
}
