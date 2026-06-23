// cv6next — Chat, desktop (the 3-column design: rooms rail · goal thread · control drawer).
// Faithful to ccds6 wired/tools/chat.html (chat-desktop node), built in React because the
// center thread is dynamic (per-step-type markup a single data-each can't express). Reuses
// GoalThreadBody so mobile and desktop render the exact same live thread. Real data only:
// rail from useChatList, thread + goal from useRoomThread/useGoalThread, composer + choice
// taps post a real message. Secondary drawer actions (pause/re-task/approve/handoff) have no
// honest store yet, so they stay inert (not faked), matching Command/Tracker desktop.

import React, { useState, useMemo } from 'react';
import { useChatList } from './data/useHomeData.js';
import { useRoomThread, useGoalThread } from './data/useRoomThread.js';
import { GoalThreadBody, SendCtx } from './ChatGoalThread.jsx';

const NAV = [
  { k: 'home', label: 'Home', d: 'M3 11l9-7 9 7|M5 9.8V20h14V9.8' },
  { k: 'chat', label: 'Chat', d: 'M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z' },
  { k: 'support', label: 'Support', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z' },
  { k: 'tracker', label: 'Tracker', d: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z|M12 2v3M12 19v3M2 12h3M19 12h3' },
  { k: 'command', label: 'Command', d: 'M7 4H4v16h3M17 4h3v16h-3' },
];

function NavTile({ item, active, onNav }) {
  const paths = item.d.split('|');
  return (
    <div className={`ctile${active ? ' on' : ''}`} onClick={() => onNav?.(item.k)} style={{ cursor: 'pointer' }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths.map((p, i) => <path key={i} d={p} />)}</svg>
      <span className="clab">{item.label}</span>
    </div>
  );
}

function RoomRow({ row, open, onClick }) {
  return (
    <div className="room" onClick={onClick} style={{ cursor: 'pointer', background: open ? 'var(--accent-weak)' : undefined }}>
      <span className={`sdot is-${row.status || 'ready'}`} style={{ flex: 'none' }} />
      <span className="rn" style={{ fontWeight: open ? 600 : 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
      {row.statusLabel ? <span style={{ fontSize: 10.5, color: open ? 'var(--accent)' : 'var(--faint)', fontWeight: 600 }}>{row.statusLabel.toLowerCase()}</span> : null}
    </div>
  );
}

function ProjectRow({ row, open, onClick }) {
  return (
    <div className="room" onClick={onClick} style={{ cursor: 'pointer', background: open ? 'var(--accent-weak)' : undefined }}>
      <svg className={`folder is-${row.tint || 'violet'}`} width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
      <span className="rn" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
    </div>
  );
}

// Plain message list (desktop) for rooms without a live structured thread.
function PlainThread({ messages }) {
  if (!messages?.length) return <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>No messages in this room yet. Start the conversation below.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 660 }}>
      {messages.map((m, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span className={`ava is-${m.agentTint || 'violet'}`} style={{ width: 30, height: 30, fontSize: 11, flex: 'none' }}>{m.agentInitials}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>{m.agentName}<span style={{ marginLeft: 8, color: 'var(--faint)' }}>{m.time}</span></div>
            <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ChatDesktop({ worldId, initialRoom, onNav, onOpenNav }) {
  const { data: list } = useChatList();
  const agents = list?.agents || [];
  const projects = list?.projects || [];

  // Selected room: the one opened from elsewhere, else the first agent. {id,name,initials,isProject,status}.
  const [picked, setPicked] = useState(initialRoom || null);
  const selected = useMemo(() => {
    if (picked) return picked;
    const a = agents[0];
    return a ? { id: a.id, name: a.name, initials: a.initials, status: a.status, statusText: a.statusLabel } : null;
  }, [picked, agents]);

  const { messages, blocks, send } = useRoomThread(worldId, selected);
  const goal = useGoalThread(worldId, selected);
  const liveThread = Array.isArray(blocks) && blocks.length > 0;

  const [draft, setDraft] = useState('');
  const submit = () => { const t = draft.trim(); if (!t) return; send?.(t); setDraft(''); };

  const pickAgent = (a) => setPicked({ id: a.id, name: a.name, initials: a.initials, status: a.status, statusText: a.statusLabel });
  const pickProject = (p) => setPicked({ id: p.id, name: p.name, initials: (p.name || '?').slice(0, 2).toUpperCase(), isProject: true, status: p.status });

  return (
    <SendCtx.Provider value={send || (() => {})}>
      <div data-cv6 data-theme="dark" className="cv6-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* topbar now mounted once in the shell (SharedNav DesktopNav) */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* rooms rail */}
          <div style={{ width: 264, flex: 'none', borderRight: '1px solid var(--divider)', padding: '18px 12px', overflowY: 'auto' }}>
            <div className="eyebrow" style={{ margin: '0 6px 8px' }}>Agents</div>
            <div style={{ marginBottom: 16 }}>
              {agents.length ? agents.map((a) => <RoomRow key={a.id} row={a} open={selected?.id === a.id && !selected?.isProject} onClick={() => pickAgent(a)} />)
                : <div style={{ color: 'var(--faint)', fontSize: 12, padding: '0 6px' }}>No agents yet.</div>}
            </div>
            <div className="eyebrow" style={{ margin: '0 6px 8px' }}>Projects</div>
            {projects.length ? projects.map((p) => <ProjectRow key={p.id} row={p} open={selected?.id === p.id && selected?.isProject} onClick={() => pickProject(p)} />)
              : <div style={{ color: 'var(--faint)', fontSize: 12, padding: '0 6px' }}>No projects yet.</div>}
          </div>

          {/* conversation */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {selected ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 24px', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ position: 'relative', flex: 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700 }}>{selected.initials || '·'}</div>
                    <span className={`sdot is-${selected.status || 'ready'}`} style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, border: '2.5px solid var(--ground)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{goal?.title ? <>Goal: {goal.title}</> : (selected.statusText || 'conversation')}</div>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
                  {liveThread ? <GoalThreadBody goal={goal} blocks={blocks} /> : <PlainThread messages={messages} />}
                </div>
                <div style={{ borderTop: '1px solid var(--divider)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                    placeholder={`Nudge ${selected.name}, or jump in…`}
                    style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '0 16px', fontSize: 15, color: 'var(--fg)', fontFamily: 'var(--font-sans)', outline: 'none' }} />
                  <button onClick={submit} style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
                  </button>
                </div>
              </>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Pick a room on the left to open its thread.</div>
            )}
          </div>

          {/* control drawer */}
          <div style={{ width: 316, flex: 'none', borderLeft: '1px solid var(--divider)', padding: 20, overflowY: 'auto' }}>
            {selected ? (
              <>
                <div className="eyebrow" style={{ color: 'var(--muted)', marginBottom: 10 }}>Agent on this goal</div>
                <div style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: 14, padding: 14, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="ava is-green" style={{ width: 34, height: 34, fontSize: 12 }}>{selected.initials || '·'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{selected.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{selected.statusText || 'ready'}</div>
                    </div>
                  </div>
                  {goal?.total ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 13 }}>
                      <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}><div style={{ width: `${goal.pct || 0}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),#6366F1)' }} /></div>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>step {goal.step}/{goal.total}</span>
                    </div>
                  ) : null}
                </div>
                {goal?.checklist?.length ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span className="eyebrow" style={{ color: 'var(--muted)' }}>Mission goals</span>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{goal.doneCount} of {goal.total}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {goal.checklist.map((it, i) => (
                        <div key={i} className={`gchk is-${it.state || 'pending'}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="gchk-mark" /><span className="gchk-label" style={{ flex: 1, fontSize: 13 }}>{it.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--faint)', fontSize: 12.5 }}>No goal set for this room yet.</div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </SendCtx.Provider>
  );
}
