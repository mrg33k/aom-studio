import React, { useState, useMemo } from 'react';
import { SideRail } from './components/navigation/SideRail.jsx';
import { CatchUpCard } from './components/rooms/CatchUpCard.jsx';
import { RoomRow } from './components/rooms/RoomRow.jsx';
import { Badge } from './components/core/Badge.jsx';

// Nav glyphs for the side rail (same set as the static kit Home).
const I = {
  home: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M5 9.8V20h14V9.8" /></svg>,
  chat: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" /></svg>,
  organize: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4 3 8l9 4 9-4-9-4Z" /><path d="m3 12 9 4 9-4" /></svg>,
  review: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>,
  support: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>,
  tracker: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2.5-7 5 14 2.5-7H21" /></svg>,
  command: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="m7.5 9.5 3 2.5-3 2.5" /><path d="M13 15h4" /></svg>,
  scribe: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><path d="M12 17.5V21" /></svg>,
};
const FOLDER = (c) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c || 'var(--violet-400)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>;

// Single-word, time-based greeting word (Patrik 2026-06-19: "[word], Name."). Picked
// once per mount so it does not re-randomize on every render.
const GREET = { morning: ['Morning,', 'Sunrise,'], afternoon: ['Afternoon,', 'Midday,'], evening: ['Evening,', 'Sundown,'], late: ['Midnight,', 'Late,'] };
function pickGreet(d = new Date()) {
  const h = d.getHours();
  const slot = h < 5 ? 'late' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'late';
  const pool = GREET[slot];
  return pool[Math.floor((h + d.getMinutes()) % pool.length)];
}
function firstName(user) {
  return user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'there';
}
// Map a raw agent/mission status onto the kit StatusDot vocabulary.
function dotStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'online') return 'online';
  if (v === 'working' || v === 'running' || v === 'active') return 'working';
  if (v === 'attention' || v === 'blocked' || v === 'needs_you') return 'attention';
  return 'idle';
}
function roomCount(p) {
  if (Array.isArray(p?.tasks)) return p.tasks.length || null;
  if (typeof p?.tasks === 'number') return p.tasks || null;
  return null;
}

/**
 * Wired CV6 mobile Home. Exact pixel-faithful pull of the design system Home screen
 * (safe-area frame with Corner logo, Catch Up deck, All Rooms list). Menu closed by
 * default; profile FAB toggles the side rail. Props kept from CornerVG: user, agents,
 * projectRooms, catchup, onSelectAgent, onSelectProject, onCatchupOpen, onNav.
 */
export function MobileHomeWired({ user, agents = [], projectRooms = [], catchup = [], onSelectAgent, onSelectProject, onCatchupOpen, onNav }) {
  // Home opens with the menu CLOSED (Patrik 2026-06-20): content full-width, the
  // side rail tucked behind the round menu button until the user opens it.
  const [menuOpen, setMenuOpen] = useState(false);
  const greet = useMemo(() => pickGreet(), []);
  const name = firstName(user);

  const navItems = [
    { key: 'home', label: 'Home', icon: I.home },
    { key: 'chat', label: 'Chat', icon: I.chat },
    { key: 'organize', label: 'Organize', icon: I.organize },
    { key: 'review', label: 'Review', icon: I.review },
    { key: 'support', label: 'Support', icon: I.support },
    { key: 'tracker', label: 'Tracker', icon: I.tracker },
    { key: 'command', label: 'Command', icon: I.command },
    { key: 'scribe', label: 'Scribe', icon: I.scribe },
  ];

  // One unified room list: agents (status dot + AGENT tag) then projects (folder + count).
  const rooms = useMemo(() => ([
    ...(agents || []).map(a => ({ kind: 'agent', raw: a, name: a.name || a.slug, status: dotStatus(a.status) })),
    ...(projectRooms || []).map(p => ({ kind: 'project', raw: p, name: p.name || p.slug, count: roomCount(p), color: p.color })),
  ]), [agents, projectRooms]);

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, width: '100%', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ position: 'absolute', left: 0, top: 'calc(env(safe-area-inset-top, 0px) + 54px)', right: menuOpen ? 72 : 0, bottom: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '6px 0 calc(env(safe-area-inset-bottom, 0px) + 28px)', transition: 'right .28s cubic-bezier(.4,0,.2,1)' }}>
        {/* Brand row: Corner logo */}
        <div style={{ padding: '4px 22px 0', marginBottom: 20, display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none" stroke="var(--fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', height: 24, width: 'auto' }}>
            <path d="M10 90 L10 10 L50 10 Q90 10 90 50 Q90 90 50 90 Z" />
            <path d="M30 30 L30 70" />
          </svg>
        </div>

        {/* Catch up eyebrow + badge */}
        <div style={{ padding: '0 22px', display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Catch up</span>
          {catchup.length > 0 && <Badge tone="weak">{catchup.length}</Badge>}
        </div>

        {/* Catch up content */}
        {catchup.length === 0 ? (
          <div style={{ margin: '0 22px 20px', padding: '18px 16px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 18, fontSize: 13.5, color: 'var(--muted)', textAlign: 'center' }}>
            Nothing needs you right now.
          </div>
        ) : (
          <div style={{ margin: '0 22px 20px' }}>
            {catchup.map((c) => (
              <div key={c.id} onClick={() => onCatchupOpen && onCatchupOpen(c)} style={{ cursor: 'pointer' }}>
                <CatchUpCard
                  project={c.roomName || c.senderName || 'Room'}
                  mission={c.senderName ? ('From ' + c.senderName) : ''}
                  time={c.timeAgo || ''}
                  text={c.messagePreview || 'Needs your attention'}
                  glyphColor="var(--violet-400)"
                />
              </div>
            ))}
          </div>
        )}

        {/* All rooms eyebrow */}
        <div style={{ padding: '0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px 0 10px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>All rooms</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>See all</span>
        </div>

        {/* Rooms list */}
        {rooms.length === 0 ? (
          <div style={{ margin: '0 22px', padding: '16px', color: 'var(--faint)', fontSize: 13 }}>No rooms yet.</div>
        ) : (
          <div style={{ margin: '0 22px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, overflow: 'hidden' }}>
            {rooms.map((r, i) => r.kind === 'agent' ? (
              <RoomRow key={'a' + i} status={r.status} name={r.name} tag="AGENT" onClick={() => onSelectAgent && onSelectAgent(r.raw)} />
            ) : (
              <RoomRow key={'p' + i} leading={FOLDER(r.color)} name={r.name} count={r.count} onClick={() => onSelectProject && onSelectProject(r.raw)} />
            ))}
          </div>
        )}
      </div>

      {/* Side rail (open) */}
      {menuOpen && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0 }}>
          <SideRail
            active="home"
            items={navItems}
            onMenu={() => setMenuOpen(false)}
            onSelect={(key) => { if (key === 'home') { setMenuOpen(false); } else if (onNav) { onNav(key); } }}
            style={{ padding: 'calc(15px + env(safe-area-inset-top, 0px)) 0 calc(16px + env(safe-area-inset-bottom, 0px))' }}
          />
        </div>
      )}

      {/* Menu FAB (hamburger + profile avatar) — when menu is closed */}
      {!menuOpen && (
        <button onClick={() => setMenuOpen(true)} aria-label="Open menu" style={{
          position: 'absolute', right: 18, bottom: 'calc(26px + env(safe-area-inset-bottom, 0px))',
          display: 'flex', alignItems: 'center', gap: 12, height: 56, padding: '0 9px 0 18px',
          border: '1px solid rgba(255,255,255,.16)',
          borderRadius: 28,
          background: 'rgba(13,17,23,.72)', backdropFilter: 'blur(18px) saturate(1.2)', WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
          boxShadow: '0 16px 36px -10px rgba(0,0,0,.7)', cursor: 'pointer',
          zIndex: 8,
        }}>
          {/* Hamburger lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <i style={{ display: 'block', width: 20, height: 2, borderRadius: 2, background: 'var(--fg)' }} />
            <i style={{ display: 'block', width: 14, height: 2, borderRadius: 2, background: 'var(--fg)' }} />
            <i style={{ display: 'block', width: 20, height: 2, borderRadius: 2, background: 'var(--fg)' }} />
          </div>
          {/* Profile avatar */}
          <div style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700, flex: 'none' }}>
            P
            {/* Online indicator dot */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: 13, height: 13, borderRadius: '50%', background: 'var(--accent)', border: '2.5px solid #0d1117' }} />
          </div>
        </button>
      )}
    </div>
  );
}
