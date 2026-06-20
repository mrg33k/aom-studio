import React, { useMemo } from 'react';
import { ToolTile } from './components/navigation/ToolTile.jsx';
import { RoomRow } from './components/rooms/RoomRow.jsx';
import { CatchUpCard } from './components/rooms/CatchUpCard.jsx';
import { MessageBubble } from './components/rooms/MessageBubble.jsx';
import { Badge } from './components/core/Badge.jsx';
import { Avatar } from './components/core/Avatar.jsx';
import { IconButton } from './components/core/IconButton.jsx';

const ICON = {
  home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M5 9.8V20h14V9.8" /></svg>,
  chat: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" /></svg>,
};
const FOLDER = (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c || 'var(--violet-400)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>;
const EYEBROW = { fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' };

const GREET = { morning: ['Morning,', 'Sunrise,'], afternoon: ['Afternoon,', 'Midday,'], evening: ['Evening,', 'Sundown,'], late: ['Midnight,', 'Late,'] };
function pickGreet(d = new Date()) {
  const h = d.getHours();
  const slot = h < 5 ? 'late' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'late';
  const pool = GREET[slot];
  return pool[Math.floor((h + d.getMinutes()) % pool.length)];
}
function firstName(user) {
  return user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
}
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
 * Wired CV6 desktop Home — three columns (Catch Up / All Rooms / recent thread),
 * an app bar and a tools row, all on REAL data. Same overrides as mobile: ONE
 * unified rooms list (no Agents/Projects subheaders), honest empty states.
 */
export function DesktopHomeWired({ user, agents = [], projectRooms = [], catchup = [], recentMessages = [], onSelectAgent, onSelectProject, onCatchupOpen, onNav }) {
  const greet = useMemo(() => pickGreet(), []);
  const name = firstName(user);
  const rooms = useMemo(() => ([
    ...(agents || []).map(a => ({ kind: 'agent', raw: a, name: a.name || a.slug, status: dotStatus(a.status) })),
    ...(projectRooms || []).map(p => ({ kind: 'project', raw: p, name: p.name || p.slug, count: roomCount(p), color: p.color })),
  ]), [agents, projectRooms]);

  const bell = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
  const moon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>;

  return (
    <div data-cv6kit data-theme="glass" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      {/* app bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 28px', flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, width: 320, height: 40, borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--hair)', padding: '0 14px', color: 'var(--faint)', fontSize: 14 }}>Search anything</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconButton>{moon}</IconButton>
          <IconButton badge>{bell}</IconButton>
          <Avatar initial={(name[0] || 'P').toUpperCase()} />
        </div>
      </div>

      {/* tools row */}
      <div style={{ padding: '6px 28px 18px', borderBottom: '1px solid var(--divider)', flex: 'none' }}>
        <div style={EYEBROW}>Tools</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <ToolTile layout="tile" icon={ICON.home} label="Home" active onClick={() => onNav && onNav('home')} />
          <ToolTile layout="tile" icon={ICON.chat} label="Chat" onClick={() => onNav && onNav('chat')} />
        </div>
      </div>

      {/* greeting */}
      <div style={{ padding: '22px 28px 18px', fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)', flex: 'none' }}>
        {greet} <span style={{ color: 'var(--faint)' }}>{name}.</span>
      </div>

      {/* columns */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, borderTop: '1px solid var(--divider)' }}>
        <div style={{ width: 360, flex: 'none', borderRight: '1px solid var(--divider)', padding: '18px 20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}><span style={EYEBROW}>Catch up</span>{catchup.length > 0 && <Badge tone="weak">{catchup.length}</Badge>}</div>
          {catchup.length === 0 ? (
            <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius-card)', fontSize: 13.5, color: 'var(--muted)' }}>Nothing needs you right now.</div>
          ) : catchup.map((c) => (
            <div key={c.id} onClick={() => onCatchupOpen && onCatchupOpen(c)} style={{ cursor: 'pointer', marginBottom: 14 }}>
              <CatchUpCard project={c.roomName || c.senderName || 'Room'} mission={c.senderName ? ('From ' + c.senderName) : ''} time={c.timeAgo || ''} text={c.messagePreview || 'Needs your attention'} glyphColor="var(--violet-400)" />
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0, padding: '18px 20px', overflowY: 'auto' }}>
          <div style={{ ...EYEBROW, marginBottom: 14 }}>All rooms</div>
          {rooms.length === 0 ? (
            <div style={{ color: 'var(--faint)', fontSize: 13 }}>No rooms yet.</div>
          ) : rooms.map((r, i) => r.kind === 'agent' ? (
            <RoomRow key={'a' + i} status={r.status} name={r.name} tag="AGENT" onClick={() => onSelectAgent && onSelectAgent(r.raw)} />
          ) : (
            <RoomRow key={'p' + i} leading={FOLDER(r.color)} name={r.name} count={r.count} onClick={() => onSelectProject && onSelectProject(r.raw)} />
          ))}
        </div>

        <div style={{ width: 420, flex: 'none', borderLeft: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', padding: '24px 20px', overflowY: 'auto' }}>
          {recentMessages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--faint)', fontSize: 13.5, padding: '0 20px' }}>Pick a room to see the latest here.</div>
          ) : recentMessages.map((m, i) => (
            <MessageBubble key={i} from={m.from} author={m.author} initials={m.initials} time={m.time}>{m.text}</MessageBubble>
          ))}
        </div>
      </div>
    </div>
  );
}
