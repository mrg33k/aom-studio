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
  roomsLoading = false,
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

  // Resting digest (loop R9, ported from the /dashboard twin after Steffen's PASS):
  // instead of a dead "pick a room" void, the pane lists the rooms with the newest
  // activity — name, last-message line, age — one click from the conversation.
  const relAge = (ts) => {
    if (!ts) return '';
    const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d`;
  };
  const restRecent = (projectRooms || []).filter((p) => p.last_message_at).slice(0, 6);
  const renderConvo = () => (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '24px 20px', overflowY: 'auto' }}>
      {recentMessages && recentMessages.length ? recentMessages.map((m, i) => (
        <MessageBubble key={i} from={m.from} author={m.author} initials={m.initials} time={m.time}>{m.text}</MessageBubble>
      )) : restRecent.length ? (
        <div style={{ width: 'min(560px, 92%)', margin: 'auto' }}>
          <div className="subhdr" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Pick up where you left off</div>
          {restRecent.map((p) => (
            <div key={p.slug} onClick={() => onSelectProject && onSelectProject(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 54, border: '1px solid var(--hair)', borderRadius: 12, background: 'var(--surface)', marginBottom: 8, padding: '10px 16px', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flex: 'none', color: 'var(--faint)' }}><circle cx="12" cy="12" r="10" /><path d="m12 6 0 6 4 2" /></svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || p.slug}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', flex: 'none' }}>Project chat</span>
                </div>
                {String(p.last_message_text || '').trim() && (
                  <div style={{ marginTop: 2, fontSize: 11, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.last_message_text}</div>
                )}
              </div>
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--faint)', flex: 'none' }}>{relAge(p.last_message_at)}</span>
              <span className="kbd" style={{ marginLeft: 8, flex: 'none' }}>→</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', marginTop: 16 }}>Open a room to see the conversation here.</div>
        </div>
      ) : (
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
      roomsLoading={roomsLoading}
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
