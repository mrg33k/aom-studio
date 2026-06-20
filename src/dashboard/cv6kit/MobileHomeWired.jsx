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
};
const FOLDER = (c) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c || 'var(--violet-400)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>;
const MENU_GLYPH = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>;

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
 * Wired CV6 mobile Home. Same look as the static kit Home (safe-area frame, menu
 * open/closed toggle) but every value is REAL: the greeting name, the Catch Up
 * deck (only items that need Patrik), and one unified All Rooms list (agents +
 * projects, no subheaders). Rendered inside CornerVG so it shares the live data
 * and the real open-room handlers.
 */
export function MobileHomeWired({ user, agents = [], projectRooms = [], catchup = [], onSelectAgent, onSelectProject, onCatchupOpen, onNav }) {
  const [menuOpen, setMenuOpen] = useState(true);
  const greet = useMemo(() => pickGreet(), []);
  const name = firstName(user);

  const navItems = [
    { key: 'home', label: 'Home', icon: I.home },
    { key: 'chat', label: 'Chat', icon: I.chat },
    { key: 'organize', label: 'Organize', icon: I.organize },
    { key: 'review', label: 'Review', icon: I.review },
  ];

  // One unified room list: agents (status dot + AGENT tag) then projects (folder + count).
  const rooms = useMemo(() => ([
    ...(agents || []).map(a => ({ kind: 'agent', raw: a, name: a.name || a.slug, status: dotStatus(a.status) })),
    ...(projectRooms || []).map(p => ({ kind: 'project', raw: p, name: p.name || p.slug, count: roomCount(p), color: p.color })),
  ]), [agents, projectRooms]);

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, width: '100%', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ position: 'absolute', left: 0, top: 'calc(env(safe-area-inset-top, 0px) + 14px)', right: menuOpen ? 72 : 0, bottom: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '6px 0 calc(28px + env(safe-area-inset-bottom, 0px))', transition: 'right .28s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ padding: '0 22px', marginBottom: 20, fontSize: 29, lineHeight: 1.1, fontWeight: 700, letterSpacing: '-.025em', color: 'var(--fg)' }}>
          {greet}<br /><span style={{ color: 'var(--faint)' }}>{name}.</span>
        </div>

        <div style={{ padding: '0 22px', display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Catch up</span>
          {catchup.length > 0 && <Badge tone="weak">{catchup.length}</Badge>}
        </div>

        {catchup.length === 0 ? (
          <div style={{ margin: '0 22px 20px', padding: '18px 16px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius-card)', fontSize: 13.5, color: 'var(--muted)' }}>
            Nothing needs you right now.
          </div>
        ) : (
          <div style={{ margin: '0 22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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

        <div style={{ padding: '0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px 0 10px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>All rooms</span>
        </div>
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

      {menuOpen && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0 }}>
          <SideRail
            active="home"
            items={navItems}
            onMenu={() => setMenuOpen(false)}
            onSelect={(key) => { if (key !== 'home' && onNav) onNav(key); }}
            style={{ padding: 'calc(15px + env(safe-area-inset-top, 0px)) 0 calc(16px + env(safe-area-inset-bottom, 0px))' }}
          />
        </div>
      )}

      {!menuOpen && (
        <button onClick={() => setMenuOpen(true)} aria-label="Open menu" style={{
          position: 'absolute', right: 18, bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
          width: 54, height: 54, borderRadius: 27, padding: 0,
          border: '1px solid rgba(255,255,255,.18)',
          background: 'rgba(18,20,26,.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 28px rgba(0,0,0,.5)', cursor: 'pointer',
        }}>{MENU_GLYPH}</button>
      )}
    </div>
  );
}
