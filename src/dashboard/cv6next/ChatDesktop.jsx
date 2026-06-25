// cv6next — Chat, desktop (the 3-column design: rooms rail · goal thread · control drawer).
// Faithful to ccds6 wired/tools/chat.html (chat-desktop node), built in React because the
// center thread is dynamic (per-step-type markup a single data-each can't express). Reuses
// GoalThreadBody so mobile and desktop render the exact same live thread. Real data only:
// rail from useChatList, thread + goal from useRoomThread/useGoalThread, composer + choice
// taps post a real message. Secondary drawer actions (pause/re-task/approve/handoff) have no
// honest store yet, so they stay inert (not faked), matching Command/Tracker desktop.

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useChatList, useProjectMissions } from './data/useHomeData.js';
import { useRoomThread, useGoalThread } from './data/useRoomThread.js';
import { GoalThreadBody, SendCtx } from './ChatGoalThread.jsx';
import { Result } from './BlockRenderer.jsx';
import { useDictation } from './data/useDictation.js';

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

// The project folder is shown above, so drop a redundant "Parent:" prefix from the mission
// name (e.g. "Andocia Deal:Deal Shape" -> "Deal Shape"). Clean names pass through.
function missionLabelClean(n) { const s = String(n || ''); return (s.includes(':') ? s.slice(s.lastIndexOf(':') + 1).trim() : s) || s; }
// Map a raw mission status to the CV6 status-dot class (live / ready / done).
function missionDot(s) {
  const v = String(s || '').toLowerCase();
  if (['running', 'building', 'active'].includes(v)) return 'live';
  if (['done', 'complete', 'completed'].includes(v)) return 'done';
  return 'ready';
}

// A project in the rail is a folder that fans open to its missions. The row itself opens the
// project's general chat; the chevron toggles the mission list; a mission row opens that
// mission's own thread on the right. Mirrors the mobile project screen, here as a tree.
const MISSION_CAP = 8; // a fanned-open project shows this many missions, then "show N more" — keeps the rail scannable when a project has dozens.
function ProjectGroup({ row, selectedProject, selectedMissionSlug, missions, expanded, onToggle, onPickProject, onPickMission }) {
  const hasMissions = missions && missions.length > 0;
  const [showAll, setShowAll] = useState(false);
  const slugOf = (m) => (String(m.slug || '').includes(':') ? m.slug : `${row.slug}:${m.slug}`);
  const selectedIdx = missions.findIndex((m) => slugOf(m) === selectedMissionSlug);
  // Always show the full list if asked, or if the selected mission sits past the cap (so it stays visible).
  const showEvery = showAll || selectedIdx >= MISSION_CAP;
  const shownMissions = showEvery ? missions : missions.slice(0, MISSION_CAP);
  const hiddenCount = missions.length - shownMissions.length;
  return (
    <div>
      <div className="room" onClick={onPickProject} style={{ cursor: 'pointer', background: selectedProject ? 'var(--accent-weak)' : undefined }}>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label={expanded ? 'Hide missions' : 'Show missions'}
          style={{ border: 'none', background: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', flex: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><path d="m9 18 6-6-6-6" /></svg>
        </button>
        <svg className={`folder is-${row.tint || 'violet'}`} width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
        <span className="rn" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: selectedProject ? 600 : 500 }}>{row.name}</span>
        {hasMissions ? <span style={{ fontSize: 11, color: 'var(--faint)', flex: 'none' }}>{missions.length}</span> : null}
      </div>
      {expanded ? (
        <div style={{ margin: '2px 0 6px 16px', borderLeft: '1px solid var(--divider)', paddingLeft: 6 }}>
          {hasMissions ? shownMissions.map((m) => {
            const missionSlug = slugOf(m);
            const on = selectedMissionSlug === missionSlug;
            return (
              <div key={m.slug} className="room" onClick={() => onPickMission(m)} style={{ cursor: 'pointer', background: on ? 'var(--accent-weak)' : undefined, paddingTop: 7, paddingBottom: 7 }}>
                <span className={`sdot is-${missionDot(m.status)}`} style={{ flex: 'none' }} />
                <span className="rn" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: on ? 600 : 500, color: on ? 'var(--fg)' : 'var(--muted)' }}>{missionLabelClean(m.name || m.slug)}</span>
              </div>
            );
          }) : <div style={{ fontSize: 12, color: 'var(--faint)', padding: '6px 8px' }}>No missions yet.</div>}
          {hiddenCount > 0 ? (
            <div className="room" onClick={() => setShowAll(true)} style={{ cursor: 'pointer', paddingTop: 7, paddingBottom: 7, color: 'var(--accent)', fontSize: 12.5, fontWeight: 600 }}>Show {hiddenCount} more</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Group plain messages (oldest -> newest) into day buckets, preserving order. Mirrors
// ChatLifecycle's mobile grouping so desktop reads the same: latest day open inline,
// older days folded into one-line cards (the "jumbled pile" fix, ported to desktop).
function dayKeyD(ts) {
  const d = ts ? new Date(ts) : null;
  if (!d || Number.isNaN(d.getTime())) return 'na';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function dayLabelD(ts) {
  const d = ts ? new Date(ts) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Earlier';
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function groupByDayD(messages) {
  const groups = []; let cur = null;
  for (const m of messages) {
    const k = dayKeyD(m.ts);
    if (!cur || cur.key !== k) { cur = { key: k, label: dayLabelD(m.ts), items: [] }; groups.push(cur); }
    cur.items.push(m);
  }
  return groups;
}

// One desktop message row (shared by the open latest day and expanded older days).
function MsgRow({ m, onSend }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span className={`ava is-${m.agentTint || 'violet'}`} style={{ width: 30, height: 30, fontSize: 11, flex: 'none' }}>{m.agentInitials}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>{m.agentName}<span style={{ marginLeft: 8, color: 'var(--faint)' }}>{m.time}</span></div>
        <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.text}</div>
        {m.blocks?.length ? (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {m.blocks.map((b, i) => (
              <Result key={i} block={b} onAction={onSend} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// An older day, folded into a one-line card you tap to open (reuses the .goalcard CSS).
function DesktopDayCard({ group, onSend }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`goalcard${open ? ' is-open' : ''}`}>
      <div className="gc-head" onClick={() => setOpen((v) => !v)}>
        <span className="gc-title">{group.label}</span>
        <span className="gc-meta">{group.items.length} message{group.items.length === 1 ? '' : 's'}</span>
        <svg className="gc-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </div>
      <div className="gc-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
          {group.items.map((m, i) => <MsgRow key={i} m={m} onSend={onSend} />)}
        </div>
      </div>
    </div>
  );
}

// Plain message list (desktop) for rooms without a live structured thread.
function PlainThread({ messages, onSend }) {
  if (!messages?.length) return <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>No messages in this room yet. Start the conversation below.</div>;
  const groups = groupByDayD(messages);
  const older = groups.slice(0, -1);
  const latest = groups[groups.length - 1] || null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 660 }}>
      {older.map((g, i) => <DesktopDayCard key={`${g.key}-${i}`} group={g} onSend={onSend} />)}
      {latest && (
        <>
          <div className="daydiv"><span>{latest.label.toUpperCase()}</span></div>
          {latest.items.map((m, i) => <MsgRow key={i} m={m} onSend={onSend} />)}
        </>
      )}
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
  const dictate = useDictation((text) => setDraft((d) => (d ? d.replace(/\s*$/, '') + ' ' : '') + text));
  const submit = () => { const t = draft.trim(); if (!t) return; send?.(t); setDraft(''); };

  // Pin to the latest message: after the thread loads (messages arrive async) and whenever a
  // new one lands, so opening a room lands at the tail and your just-sent message isn't hidden
  // below the fold. Reading history (scrolled up) is left alone.
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const prevLenRef = useRef(0);
  const selKey = selected?.id || '';
  useEffect(() => { prevLenRef.current = 0; }, [selKey]);
  useEffect(() => {
    const el = scrollRef.current;
    const len = messages?.length || 0;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (!el || !len) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (prev === 0) bottomRef.current?.scrollIntoView();
    else if (fromBottom < 260) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selKey]);

  const pickAgent = (a) => setPicked({ id: a.id, name: a.name, initials: a.initials, status: a.status, statusText: a.statusLabel });
  const pickProject = (p) => setPicked({ id: p.id, name: p.name, initials: (p.name || '?').slice(0, 2).toUpperCase(), isProject: true, status: p.status, statusText: 'project chat' });
  const pickMission = (p, m) => { const nm = missionLabelClean(m.name || m.slug); setPicked({ id: m.slug, name: nm, initials: (nm || '?').slice(0, 2).toUpperCase(), isMission: true, missionSlug: String(m.slug || '').includes(':') ? m.slug : `${p.slug}:${m.slug}`, projectSlug: p.slug, status: missionDot(m.status), statusText: p.name }); };

  // Real missions per project (same endpoint the mobile project screen uses). Each project
  // row fans open to these; clicking one opens that mission's own thread.
  const missionsByProject = useProjectMissions(worldId);
  const [expanded, setExpanded] = useState(() => new Set());
  const toggleProject = (slug) => setExpanded((prev) => { const n = new Set(prev); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });
  // Fan open ONLY the project we arrive on (from Home) — keyed on initialRoom, not on every
  // selection. After arrival, expansion is fully user-driven, so a manual collapse always sticks
  // (clicking a project row again closes it; the effect won't re-open it).
  useEffect(() => {
    const slug = initialRoom?.isMission ? initialRoom.projectSlug
      : (initialRoom?.isProject ? ((projects.find((p) => p.id === initialRoom.id) || {}).slug || initialRoom.id) : null);
    if (slug) setExpanded((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));
  }, [initialRoom?.id, initialRoom?.isProject, initialRoom?.isMission, projects]);

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
            {projects.length ? projects.map((p) => (
              <ProjectGroup key={p.id} row={p}
                selectedProject={selected?.id === p.id && selected?.isProject}
                selectedMissionSlug={selected?.isMission ? selected.missionSlug : null}
                missions={missionsByProject[p.slug] || []}
                expanded={expanded.has(p.slug)}
                onToggle={() => toggleProject(p.slug)}
                onPickProject={() => { pickProject(p); toggleProject(p.slug); }}
                onPickMission={(m) => pickMission(p, m)} />
            ))
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
                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
                  {/* Readable column cap so a wide screen (iPad landscape, big desktop) keeps
                      the thread + its tables/charts centered instead of stretched. */}
                  <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    {liveThread ? <GoalThreadBody goal={goal} blocks={blocks} /> : <PlainThread messages={messages} onSend={send} />}
                    <div ref={bottomRef} style={{ height: 4 }} />
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--divider)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {dictate.supported && (
                    <button onClick={dictate.toggle} aria-label={dictate.listening ? 'Stop dictation' : 'Speak your message'}
                      title={dictate.listening ? 'Listening… click to stop' : 'Speak your message'}
                      style={{ width: 44, height: 44, borderRadius: 12, border: 'none', flex: 'none', cursor: 'pointer',
                        background: dictate.listening ? '#e5484d' : 'var(--surface-2)', color: dictate.listening ? '#fff' : 'var(--faint)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: dictate.listening ? '0 0 0 4px rgba(229,72,77,.18)' : 'none',
                        transition: 'background .15s, box-shadow .15s, color .15s' }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                    </button>
                  )}
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                    placeholder={dictate.listening ? 'Listening…' : `Nudge ${selected.name}, or jump in…`}
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
                {/* 1. Who/what is selected. A project room has no single agent, so label it as the room, not "Agent on this goal". */}
                <div className="eyebrow" style={{ color: 'var(--muted)', marginBottom: 10 }}>{selected.isMission ? 'Mission' : selected.isProject ? 'Project room' : 'Agent on this goal'}</div>
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
                  {/* Pause / Re-task buttons (held-c: agent-control backend doesn't exist yet) */}
                  <div style={{ display: 'flex', gap: 7, marginTop: 13 }}>
                    <button disabled style={{ flex: 1, height: 34, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--faint)', fontSize: 12, fontWeight: 600, cursor: 'not-allowed', opacity: 0.5 }} title="Available when agent control backend is ready">Pause</button>
                    <button disabled style={{ flex: 1, height: 34, borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'not-allowed', opacity: 0.5 }} title="Available when agent control backend is ready">Re-task</button>
                  </div>
                </div>

                {/* 2. Quick actions (held-c: agent task approval backend doesn't exist) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>2</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Quick actions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  <button disabled style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 11px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--faint)', fontSize: 12.5, fontWeight: 500, cursor: 'not-allowed', opacity: 0.5 }} title="Available when agent supports task approval">
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--success-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>
                    </span>
                    Approve plan
                  </button>
                  <button disabled style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 11px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--faint)', fontSize: 12.5, fontWeight: 500, cursor: 'not-allowed', opacity: 0.5 }} title="Available when agent supports task handoff">
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7"/></svg>
                    </span>
                    Hand off
                  </button>
                  <button disabled style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 11px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--faint)', fontSize: 12.5, fontWeight: 500, cursor: 'not-allowed', opacity: 0.5 }} title="Available when agent file attach backend is ready">
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </span>
                    Add a file
                  </button>
                </div>

                {/* 3. Context / Goals */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>3</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Context / goals</span>
                </div>
                {goal?.checklist?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
                    {goal.checklist.map((it, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ width: 15, height: 15, borderRadius: '50%', background: it.state === 'done' ? 'var(--success)' : 'transparent', border: it.state !== 'done' ? '2px solid var(--accent)' : 'none', flex: 'none' }} />
                        <span style={{ flex: 1, fontSize: 12.5, color: it.state === 'done' ? 'var(--muted)' : 'var(--fg)', textDecoration: it.state === 'done' ? 'line-through' : 'none', fontWeight: it.state === 'done' ? 400 : 500 }}>{it.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--faint)', fontSize: 12.5, marginBottom: 20 }}>No goal set for this room yet.</div>
                )}

                {/* 4. Attachments */}
                {(() => {
                  const attachments = [];
                  if (messages?.length) {
                    for (const m of messages) {
                      if (m.attachmentUrl && m.fileName) {
                        attachments.push({ url: m.attachmentUrl, name: m.fileName, mime: m.fileMime });
                      }
                    }
                  }
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>4</span>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Attachments</span>
                      </div>
                      {attachments.length ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {attachments.map((att, i) => (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--accent)', textDecoration: 'none', cursor: 'pointer' }}>
                              <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--violet-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--faint)', fontSize: 12.5 }}>No attachments in this conversation yet.</div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </SendCtx.Provider>
  );
}
