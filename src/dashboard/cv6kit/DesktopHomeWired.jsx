import React, { useMemo } from 'react';
import { DesktopHomeView } from './DesktopHomeView.jsx';
import { CatchUpCard } from './components/rooms/CatchUpCard.jsx';
import { MessageBubble } from './components/rooms/MessageBubble.jsx';

/**
 * Wired CV6 DESKTOP Home — the faithful three-column design (DesktopHomeView)
 * fed REAL data with HONEST columns:
 *   - All Rooms: real agents (status dots + notes) then real projects (folder + count).
 *   - Catch Up: real catch-up items as cards (honest empty when nothing needs you).
 *   - Conversation: a real recent thread, or an honest prompt to pick a room (the rich
 *     agent goal dashboard in the design is sample-only; we do not fabricate that data).
 * The app bar tools row routes through onNav, exactly like the mobile Home menu.
 */

function dotColor(status) {
  const v = String(status || '').toLowerCase();
  if (v === 'online' || v === 'active') return 'var(--success)';
  if (v === 'working' || v === 'running') return 'var(--status-working,#fbbf24)';
  if (v === 'attention' || v === 'blocked' || v === 'needs_you') return 'var(--warn)';
  return 'var(--faint)';
}
function statusNote(status) {
  const v = String(status || '').toLowerCase();
  if (v === 'working' || v === 'running') return 'working';
  if (v === 'attention' || v === 'blocked' || v === 'needs_you') return 'needs you';
  return null;
}
function roomCount(p) {
  if (Array.isArray(p?.tasks)) return p.tasks.length || null;
  if (typeof p?.tasks === 'number') return p.tasks || null;
  return null;
}
function firstName(user) {
  return user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
}

export function DesktopHomeWired({
  user,
  agents = [],
  projectRooms = [],
  catchup = [],
  recentMessages = [],
  onSelectAgent,
  onSelectProject,
  onCatchupOpen,
  onNav,
  theme = 'glass',
}) {
  const dvAgents = useMemo(() => (agents || []).map((a) => ({
    name: a.name || a.slug, raw: a, dot: dotColor(a.status), glow: String(a.status).toLowerCase() === 'online', note: statusNote(a.status), noteAccent: false,
  })), [agents]);
  const dvProjects = useMemo(() => (projectRooms || []).map((p) => ({
    name: p.name || p.slug, raw: p, color: p.color || 'var(--accent)', count: roomCount(p),
  })), [projectRooms]);

  const handleSelectRoom = (name) => {
    const a = (agents || []).find((x) => (x.name || x.slug) === name);
    if (a) { if (onSelectAgent) onSelectAgent(a); return; }
    const p = (projectRooms || []).find((x) => (x.name || x.slug) === name);
    if (p && onSelectProject) onSelectProject(p);
  };

  const catchContent = (catchup && catchup.length)
    ? catchup.map((c) => (
      <div key={c.id} onClick={() => onCatchupOpen && onCatchupOpen(c)} style={{ cursor: 'pointer', marginBottom: 14 }}>
        <CatchUpCard
          project={c.roomName || c.senderName || 'Room'}
          mission={c.senderName ? ('From ' + c.senderName) : ''}
          time={c.timeAgo || ''}
          text={c.messagePreview || 'Needs your attention'}
          glyphColor="var(--violet-400)"
        />
      </div>
    ))
    : (
      <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, fontSize: 13.5, color: 'var(--muted)' }}>
        Nothing needs you right now.
      </div>
    );

  const renderConvo = () => (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '24px 20px', overflowY: 'auto' }}>
      {recentMessages && recentMessages.length ? recentMessages.map((m, i) => (
        <MessageBubble key={i} from={m.from} author={m.author} initials={m.initials} time={m.time}>{m.text}</MessageBubble>
      )) : (
        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--faint)', fontSize: 13.5, padding: '0 20px' }}>
          Pick a room on the left to open the conversation here.
        </div>
      )}
    </div>
  );

  return (
    <DesktopHomeView
      theme={theme}
      user={{ initial: (firstName(user)[0] || 'P').toUpperCase() }}
      agents={dvAgents}
      projects={dvProjects}
      agentTotal={agents.length}
      projectTotal={projectRooms.length}
      roomTotal={agents.length + projectRooms.length}
      catchTotal={catchup.length}
      activeTool="home"
      onNav={onNav}
      onSelectRoom={handleSelectRoom}
      onNewRoom={() => onNav && onNav('home')}
      catchContent={catchContent}
      renderConvo={renderConvo}
    />
  );
}

export default DesktopHomeWired;
