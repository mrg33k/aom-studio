import { useState } from 'react';
import { useMediaQuery } from '../cv6kit/useMediaQuery.js';
import { useSettings } from './data/useSettings.js';
import { useWorldId } from '../lib/tenantContext.jsx';

const SECTIONS = [
  { id: 'workspace', label: 'Workspace', sub: 'Rooms available to your agents' },
  { id: 'appearance', label: 'Appearance', sub: 'Dark, Light, and Glass' },
  { id: 'account', label: 'Account', sub: 'Your signed-in identity' },
  { id: 'planned', label: 'Planned', sub: 'Capabilities not connected yet' },
];

const THEMES = [
  { id: 'dark', label: 'Dark', ground: '#0A0A0B', surface: '#1a1c21', accent: '#2f7af8' },
  { id: 'light', label: 'Light', ground: '#f6f6f7', surface: '#ffffff', accent: '#2064d8' },
  { id: 'glass', label: 'Glass', ground: '#0c1218', surface: '#243341', accent: '#4f91ff' },
];

const PLANNED = [
  { name: 'Connections', desc: 'OAuth accounts and service scopes' },
  { name: 'Secrets', desc: 'Managed keys and rotation history' },
  { name: 'Agent permissions', desc: 'Per-agent autonomy controls' },
  { name: 'Notifications', desc: 'Account-level delivery preferences' },
];

function Header({ isMobile, onNav, onOpenNav, onSearch }) {
  if (!isMobile) return (
    <div style={{ padding: '25px 30px 18px', borderBottom: '1px solid var(--divider)' }}>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.025em', color: 'var(--fg)' }}>Settings</div>
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>What works now is editable. Planned capabilities are labeled and inert.</div>
    </div>
  );
  return (
    <div className="mhdr">
      <button type="button" className="mback" aria-label="Back to Rooms" onClick={() => onNav?.('home')}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button>
      <div className="mhtitle"><div className="mttl">Settings</div><div className="msub">Available now and planned</div></div>
      <div className="mhactions">
        <button type="button" className="ib" aria-label="Search" onClick={onSearch}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
        <button type="button" className="ib" aria-label="Menu" onClick={onOpenNav}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
      </div>
    </div>
  );
}

function WorkspacePanel({ rooms }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>Workspace rooms</div>
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>These project rooms are loaded from your current workspace. Scope editing will appear only when enforcement exists.</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
        {rooms.length ? rooms.map((room) => (
          <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 11, minHeight: 52, padding: '8px 12px', border: '1px solid var(--hair)', borderRadius: 12, background: 'var(--surface)' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', background: 'var(--accent-weak)', flex: 'none' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg></span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</div><div style={{ marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>{room.scopeLabel || 'Private'}</div></div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', background: 'var(--chip)', borderRadius: 8, padding: '4px 8px' }}>AVAILABLE</span>
          </div>
        )) : <div style={{ padding: '28px 16px', border: '1px dashed var(--hair)', borderRadius: 12, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>No project rooms are available in this workspace yet.</div>}
      </div>
    </div>
  );
}

function AppearancePanel({ theme, onTheme }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>Appearance</div>
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>One shared theme setting updates the shell and every screen immediately.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 18 }}>
        {THEMES.map((item) => {
          const selected = theme === item.id;
          return (
            <button type="button" key={item.id} onClick={() => onTheme?.(item.id)} aria-pressed={selected}
              style={{ padding: 10, borderRadius: 13, border: `1px solid ${selected ? 'var(--accent)' : 'var(--hair)'}`, background: selected ? 'var(--accent-weak)' : 'var(--surface)', color: 'var(--fg)', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              <span style={{ height: 82, borderRadius: 9, display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: item.ground, border: '1px solid rgba(127,127,127,.25)' }}>
                <span style={{ display: 'block', width: '42%', height: 7, borderRadius: 4, background: item.accent }} />
                <span style={{ display: 'block', width: '78%', height: 8, borderRadius: 4, background: item.surface }} />
                <span style={{ display: 'block', width: '62%', height: 8, borderRadius: 4, background: item.surface }} />
              </span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 13, fontWeight: 600 }}><span>{item.label}</span><span style={{ color: selected ? 'var(--accent)' : 'var(--muted)' }}>{selected ? 'Selected' : 'Choose'}</span></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AccountPanel({ profile }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>Account</div>
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 13, padding: 16, border: '1px solid var(--hair)', borderRadius: 14, background: 'var(--surface)' }}>
        <span className="av" aria-hidden="true" style={{ width: 44, height: 44 }}>{profile.initials}</span>
        <div style={{ minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--fg)' }}>{profile.name || 'Signed-in user'}</div><div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.email}</div></div>
      </div>
      <a href="/onboarding/voice" style={{ display: 'inline-flex', alignItems: 'center', marginTop: 14, height: 36, padding: '0 13px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--accent)', textDecoration: 'none', fontSize: 12.5, fontWeight: 600 }}>Open account onboarding</a>
    </div>
  );
}

function PlannedPanel() {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>Planned capabilities</div>
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>These are intentionally informational. They will become controls only when a persisted, enforced backend exists.</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
        {PLANNED.map((item) => (
          <div key={item.name} aria-disabled="true" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', border: '1px solid var(--hair)', borderRadius: 12, background: 'var(--surface)', opacity: .72 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--faint)', flex: 'none' }} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>{item.name}</div><div style={{ marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>{item.desc}</div></div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', background: 'var(--chip)', borderRadius: 8, padding: '4px 8px', whiteSpace: 'nowrap' }}>COMING LATER</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Settings({ onNav, onOpenNav, onSearch, theme = 'dark', onTheme }) {
  const isMobile = useMediaQuery('(max-width: 899px)');
  const worldId = useWorldId();
  const { state, data } = useSettings(worldId, theme);
  // Land on the one section with a real, editable control (theme). Workspace is
  // read-only and Planned is inert, so opening there is a dead end (design-gate
  // intention: land the user on the thing they can actually DO).
  const [section, setSection] = useState('appearance');
  const rooms = data?.rooms || [];
  const profile = data?.profile || { initials: '·', name: '', email: '' };

  const panel = section === 'appearance' ? <AppearancePanel theme={theme} onTheme={onTheme} />
    : section === 'account' ? <AccountPanel profile={profile} />
      : section === 'planned' ? <PlannedPanel />
        : <WorkspacePanel rooms={rooms} />;

  return (
    <div data-cv6 className="cv6-screen" style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <Header isMobile={isMobile} onNav={onNav} onOpenNav={onOpenNav} onSearch={onSearch} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        <nav aria-label="Settings sections" style={{ width: isMobile ? '100%' : 230, flex: 'none', padding: isMobile ? '10px 12px' : '18px 14px', borderRight: isMobile ? 'none' : '1px solid var(--divider)', borderBottom: isMobile ? '1px solid var(--divider)' : 'none', display: isMobile ? 'flex' : 'block', gap: 6, overflowX: isMobile ? 'auto' : 'visible' }}>
          {SECTIONS.map((item) => {
            const active = item.id === section;
            return <button type="button" key={item.id} onClick={() => setSection(item.id)} aria-current={active ? 'page' : undefined} style={{ width: isMobile ? 'auto' : '100%', minWidth: isMobile ? 'max-content' : 0, display: 'block', padding: isMobile ? '8px 11px' : '10px 11px', marginBottom: isMobile ? 0 : 5, borderRadius: 10, border: 'none', background: active ? 'var(--accent-weak)' : 'transparent', color: active ? 'var(--accent)' : 'var(--muted)', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}><span style={{ display: 'block', fontSize: 13, fontWeight: 650 }}>{item.label}</span>{!isMobile ? <span style={{ display: 'block', marginTop: 2, fontSize: 11.5, lineHeight: 1.35, color: active ? 'var(--accent)' : 'var(--muted)' }}>{item.sub}</span> : null}</button>;
          })}
        </nav>
        <main style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', padding: isMobile ? '22px 16px max(28px,env(safe-area-inset-bottom))' : '26px 30px' }}>
          <div style={{ maxWidth: 760 }}>
            {state === 'loading' && section !== 'appearance' && section !== 'planned' ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading settings…</div> : (
              <>
                {state === 'error' ? <div role="status" style={{ marginBottom: 14, padding: '9px 11px', borderRadius: 10, border: '1px solid rgba(251,191,36,.3)', background: 'var(--warn-weak)', color: 'var(--warn)', fontSize: 12 }}>Workspace details did not load. Appearance and capability status are still available.</div> : null}
                {panel}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
