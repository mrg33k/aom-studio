import React from 'react';
import { CvgDesktopChrome } from './CvgDesktopChrome.jsx';
import { CvgMobileHeader } from './CvgMobileHeader.jsx';

/**
 * CV6 kit Chat — Rooms rail · Goal thread · Mission goals & files drawer.
 * Ported from ui_kits/tools/chat.html (desktop) + ui_kits/mobile/chat-list.html (mobile).
 *
 * DESKTOP: 3-pane layout with top bar, rooms rail (left), conversation thread (center),
 * context drawer (right). Renders a goal with stepped timeline, decision points, and
 * mission goals + attachments panel.
 *
 * MOBILE: Full-screen thread view with header (back + avatar + name + status), step
 * timeline, and bottom composer. Falls back to room list if no active thread.
 *
 * Props:
 *   isDesktop           — true for fixed full-screen desktop, false for mobile fallthrough
 *   activeTool          — 'chat' (passed to CvgDesktopChrome)
 *   onNav(key)          — tool navigation callback
 *   user                — { initial, name } for avatar
 *   ...data             — everything else merged with SAMPLE_CHAT defaults
 *
 * All styling inline with var(--x) CSS custom properties from frame.css.
 */

export const SAMPLE_CHAT = {
  // Desktop rooms rail
  agents: [
    { id: 'elon', name: 'Elon', initials: 'EL', online: true, status: 'on step 3', statusNote: 'working', color: 'var(--success)' },
    { id: 'rex', name: 'Rex', initials: 'RX', online: true, status: 'working', statusNote: 'working', color: 'var(--status-working)' },
    { id: 'gary', name: 'Gary', initials: 'GA', online: false, status: 'blocked', statusNote: 'blocked', color: 'var(--warn)' },
  ],
  projects: [
    { id: 'space-rising', name: 'Space Rising', icon: 'var(--violet-400)', unread: 28 },
    { id: 'corner', name: 'Corner', icon: 'var(--accent)', unread: 84 },
  ],
  // Active agent/room at top
  active: {
    id: 'elon',
    name: 'Elon',
    initials: 'EL',
    project: 'Space Rising',
    mission: '/007',
    status: 'working now',
    online: true,
    avatar: 'var(--avatar)', // avatar background color
    following: true,
  },
  // Goal thread
  goal: {
    title: 'Lock the print framing',
    icon: 'target', // 'target' renders the goal icon
    done: 2,
    total: 4,
  },
  // Steps in the thread
  steps: [
    {
      id: 'step-1',
      kind: 'done', // 'done' | 'snag' | 'choice' | 'working' | 'upnext'
      title: 'Read the brief & pulled the repo',
      sub: 'Scanned 28 missions and the task-runner. Everything lined up except one thing…',
      statusLabel: 'Done',
    },
    {
      id: 'step-2',
      kind: 'snag',
      title: 'Hit a snag',
      sub: 'The Space Rising repo isn\'t wired into the task runner yet, so the print can\'t build. Two ways forward · your call:',
      statusLabel: 'Needs you',
      choices: [
        {
          id: 'choice-1',
          title: 'Quick reversible fix',
          sub: 'Wire it in now, migrate cleanly later. Unblocks the print. Recommended.',
          recommended: true,
        },
        {
          id: 'choice-2',
          title: 'Do it the clean way',
          sub: 'Set up a proper projects entry first. Slower, but tidier long-term.',
          recommended: false,
        },
      ],
    },
    {
      id: 'step-choice',
      kind: 'choice',
      title: 'You chose the quick fix',
      sub: '· "but pin the framing first."',
      userInitial: 'P',
    },
    {
      id: 'step-3',
      kind: 'working',
      title: 'Patching the resolver',
      sub: 'Pinned your framing, now teaching the task runner where the repo lives.',
      statusLabel: 'Working',
      progress: { pct: 64, label: 'step 3 of 4' },
    },
    {
      id: 'step-4',
      kind: 'upnext',
      title: 'Re-run the print build',
      statusLabel: 'Up next',
    },
  ],
  // Context drawer (right panel desktop)
  agent: {
    name: 'Elon',
    initials: 'EL',
    role: 'Driver · patching resolver',
    online: true,
    progress: { pct: 64, label: 'step 3/4' },
    buttons: [
      { id: 'pause', label: 'Pause', icon: 'pause' },
      { id: 'retask', label: 'Re-task', icon: 'edit' },
    ],
  },
  quickActions: [
    { id: 'approve', label: 'Approve current plan', icon: 'check', bg: 'var(--success-weak)' },
    { id: 'handoff', label: 'Hand off to another agent', icon: 'arrows', bg: 'var(--accent-weak)' },
    { id: 'add-file', label: 'Add a file or context', icon: 'plus', bg: 'var(--chip)' },
  ],
  missionGoals: [
    { id: 'mg-1', label: 'Frame the print spec', done: true },
    { id: 'mg-2', label: 'Pull repo & scan task-runner', done: true },
    { id: 'mg-3', label: 'Wire repo into the runner', done: false, active: true },
    { id: 'mg-4', label: 'Re-run the print build', done: false, active: false },
  ],
  attachments: [
    { id: 'att-1', name: 'handoff.md', size: '8 KB', type: 'markdown' },
    { id: 'att-2', name: 'resolver-diagram.png', size: '240 KB', type: 'image' },
  ],
  // Mobile room list (fallback)
  mobileRooms: [
    { id: 'elon', name: 'Elon', initials: 'EL', sub: 'Patching the resolver · step 3 of 4', status: 'live', time: '2m' },
    { id: 'rex', name: 'Rex', initials: 'RX', sub: 'Pushed the changelog draft', status: 'live', time: '8m' },
    { id: 'gary', name: 'Gary', initials: 'GA', sub: 'Which framing should I lock?', status: 'blocked', time: '12m', unread: 1 },
    { id: 'quinn', name: 'Quinn', initials: 'QN', sub: 'Ready when you are', status: 'ready', time: '1h' },
  ],
};

// SVG icons inlined
const ICON = {
  target: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/></svg>,
  check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17v.01"/><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/></svg>,
  spin: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'spin 1.1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>,
  line: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>,
  back: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  mic: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>,
  send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>,
};

function StepIcon({ kind, userInitial }) {
  if (kind === 'choice') {
    return <div style={{ background: 'var(--accent-weak)', width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', zIndex: 1, color: '#fff', fontSize: 12, fontWeight: 700 }}>{userInitial || 'P'}</div>;
  }
  const bg = kind === 'done' ? 'var(--success-weak)' : kind === 'snag' ? 'var(--warn-weak, rgba(251,191,36,.16))' : kind === 'working' ? 'var(--accent-weak)' : 'var(--chip)';
  const icon = kind === 'done' ? ICON.check : kind === 'snag' ? ICON.warn : kind === 'working' ? ICON.spin : ICON.line;
  return <div style={{ background: bg, width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', zIndex: 1 }}>{icon}</div>;
}

function DesktopChat({ data, onNav, user }) {
  const d = { ...SAMPLE_CHAT, ...data };
  const active = d.active || SAMPLE_CHAT.active;
  const goal = d.goal || SAMPLE_CHAT.goal;
  const steps = d.steps || SAMPLE_CHAT.steps;
  const agent = d.agent || SAMPLE_CHAT.agent;
  const missionGoals = d.missionGoals || SAMPLE_CHAT.missionGoals;
  const attachments = d.attachments || SAMPLE_CHAT.attachments;

  return (
    <div data-cv6kit style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes barGlow { 0%,100%{opacity:.85;} 50%{opacity:1;} }
        @keyframes livePulse { 0%,100%{opacity:1;} 50%{opacity:.5;} }
      `}</style>
      <CvgDesktopChrome activeTool="chat" onNav={onNav} user={user} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* ROOMS RAIL */}
        <div style={{ width: 264, flex: 'none', borderRight: '1px solid var(--divider)', padding: '18px 12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 38, borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--hair)', padding: '0 13px', marginBottom: 16, color: 'var(--faint)', fontSize: 13 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <span>Search rooms…</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 6px 8px' }}>Agents</div>
          <div style={{ marginBottom: 16 }}>
            {d.agents?.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, marginBottom: 8, background: a.id === active.id ? 'var(--accent-weak)' : 'transparent' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flex: 'none', boxShadow: a.online ? 'var(--glow-online)' : 'none' }} />
                <span style={{ flex: 1, fontSize: 14, color: 'var(--fg)', fontWeight: a.id === active.id ? 600 : 400 }}>{a.name}</span>
                {a.status && <span style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 600 }}>{a.status}</span>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 6px 8px' }}>Projects</div>
          {d.projects?.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, marginBottom: 8 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={p.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--fg)' }}>{p.name}</span>
              <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>{p.unread}</span>
            </div>
          ))}
        </div>

        {/* CONVERSATION CENTER */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 24px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ position: 'relative', flex: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: active.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700 }}>{active.initials}</div>
              <span style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, background: 'var(--success)', boxShadow: 'var(--glow-online)', border: '2.5px solid var(--ground)', borderRadius: '50%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{active.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{active.project} · Mission {active.mission} · {active.status}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: 'var(--success)', background: 'var(--success-weak)', padding: '6px 12px', borderRadius: 18 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              Following along
            </div>
          </div>

          {/* thread */}
          <div style={{ flex: 1, overflow: 'hidden', padding: '22px 24px' }}>
            <div style={{ maxWidth: 660 }}>
              {/* Goal header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{ICON.target}</span>
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Goal:</span> {goal.title}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{goal.done} of {goal.total} done</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {Array.from({ length: goal.total }, (_, i) => (
                      <span key={i} style={{ width: 18, height: 4, borderRadius: 2, background: i < goal.done ? 'var(--success)' : 'var(--surface-2)' }} />
                    ))}
                  </div>
                </span>
              </div>

              {/* Steps */}
              {steps.map((s, i) => {
                const last = i === steps.length - 1;
                const hasLine = !last && s.kind !== 'upnext';
                const transparent = s.kind === 'done' || s.kind === 'upnext';

                return (
                  <div key={s.id} style={{ position: 'relative', paddingLeft: 50, paddingBottom: 16 }}>
                    {hasLine && <span style={{ position: 'absolute', left: 18, top: 38, bottom: -4, width: 2, background: 'var(--divider)' }} />}
                    <div style={{ position: 'absolute', left: 0, top: 0 }}>
                      <StepIcon kind={s.kind} userInitial={active.initials} />
                    </div>
                    <div style={{
                      borderRadius: 14,
                      padding: transparent ? '8px 16px' : '13px 16px',
                      background: s.kind === 'choice' ? 'var(--accent-weak)' : transparent ? 'transparent' : 'var(--surface)',
                      border: s.kind === 'choice' || transparent ? 'none' : '1px solid var(--hair)',
                    }}>
                      {s.kind === 'choice' ? (
                        <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 600 }}>{s.title}</span>
                          {s.sub && <span> {s.sub}</span>}
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontSize: 14.5, fontWeight: 600, color: transparent ? 'var(--muted)' : 'var(--fg)' }}>{s.title}</span>
                            {s.statusLabel && (
                              <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 9px',
                                borderRadius: 20,
                                color: s.kind === 'done' ? 'var(--success)' : s.kind === 'snag' ? 'var(--warn)' : 'var(--accent)',
                                background: s.kind === 'done' ? 'var(--success-weak)' : s.kind === 'snag' ? 'var(--warn-weak, rgba(251,191,36,.16))' : 'var(--accent-weak)',
                              }}>
                                {s.statusLabel}
                              </span>
                            )}
                          </div>
                          {s.sub && <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)', marginTop: 3 }}>{s.sub}</div>}

                          {/* Choices */}
                          {s.choices && s.choices.length > 0 && (
                            <div style={{ display: 'flex', gap: 10, marginTop: 13 }}>
                              {s.choices.map((c) => (
                                <div key={c.id} style={{
                                  flex: 1,
                                  borderRadius: 12,
                                  padding: '12px 13px',
                                  background: c.recommended ? 'var(--accent)' : 'var(--surface-2)',
                                  border: c.recommended ? '1px solid transparent' : '1px solid var(--hair)',
                                  cursor: 'pointer',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: c.recommended ? '#fff' : 'var(--fg)' }}>
                                    {c.recommended ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>}
                                    <span>{c.recommended ? 'Quick reversible fix' : 'Do it the clean way'}</span>
                                  </div>
                                  <div style={{ fontSize: 11.5, lineHeight: 1.4, marginTop: 4, color: c.recommended ? 'rgba(255,255,255,.85)' : 'var(--muted)' }}>{c.sub}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Progress bar */}
                          {s.progress && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11 }}>
                              <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${s.progress.pct}%`,
                                  height: '100%',
                                  borderRadius: 4,
                                  background: 'linear-gradient(90deg,var(--accent),#6366F1)',
                                  animation: 'barGlow 1.6s ease-in-out infinite',
                                }} />
                              </div>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{s.progress.label}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* composer */}
          <div style={{ borderTop: '1px solid var(--divider)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{ width: 42, height: 42, borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: 'var(--ring-accent)', cursor: 'pointer' }}>{ICON.mic}</button>
            <div style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 15, color: 'var(--faint)' }}>Nudge {active.name}, or jump in…</div>
            <button style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>{ICON.send}</button>
          </div>
        </div>

        {/* CONTEXT DRAWER RIGHT */}
        <div style={{ width: 316, flex: 'none', borderLeft: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden', padding: 20 }}>
            {/* Agent control */}
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Agent on this goal</div>
            <div style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: 14, padding: 14, marginBottom: 20, boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
                <div style={{ position: 'relative', flex: 'none' }}>
                  <span style={{ width: 34, height: 34, background: 'rgba(52,211,153,.2)', color: 'var(--success)', fontSize: 12, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>EL</span>
                  <span style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, background: 'var(--success)', boxShadow: 'var(--glow-online)', border: '2px solid var(--surface)', borderRadius: '50%' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Elon</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Driver · patching resolver</div>
                </div>
                <button style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{ width: '64%', height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),#6366F1)', animation: 'barGlow 1.6s ease-in-out infinite' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>step 3/4</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, height: 40, borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                  Pause
                </button>
                <button style={{ flex: 1, height: 40, borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  Re-task
                </button>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Quick actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 22 }}>
              {d.quickActions?.slice(0, 3).map((qa) => (
                <button key={qa.id} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', height: 44, padding: '0 12px', borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: qa.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    {qa.id === 'approve' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>}
                    {qa.id === 'handoff' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7"/></svg>}
                    {qa.id === 'add-file' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M12 12v6M9 15h6"/></svg>}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{qa.label}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>

            {/* Mission goals */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Mission goals</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)' }}>
                {missionGoals?.filter(g => g.done).length} of {missionGoals?.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
              {missionGoals?.map((g) => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {g.done ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="var(--success)" stroke="none" style={{ flex: 'none' }}><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6" stroke="#0A0A0B" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : g.active ? (
                    <span style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'livePulse 1.6s infinite' }} />
                    </span>
                  ) : (
                    <span style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid var(--divider)', flex: 'none' }} />
                  )}
                  <span style={{ flex: 1, fontSize: 13, color: g.done ? 'var(--muted)' : 'var(--fg)', textDecoration: g.done ? 'line-through' : 'none', fontWeight: g.active ? 500 : 400 }}>{g.label}</span>
                </div>
              ))}
            </div>

            {/* Attachments */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Attachments</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)' }}>{attachments?.length}</span>
              <button style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments?.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: '1px solid var(--hair)', borderRadius: 11, background: 'var(--surface)' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: a.type === 'markdown' ? 'linear-gradient(135deg,#1e2433,#11151c)' : 'linear-gradient(135deg,#2a2030,#15161a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    {a.type === 'markdown' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--violet-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pink-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{a.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--faint)' }}>{a.size}</div>
                  </div>
                  <button style={{ height: 28, padding: '0 11px', borderRadius: 8, border: 'none', background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Review</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileChat({ data, onNav, user }) {
  const d = { ...SAMPLE_CHAT, ...data };
  const active = d.active || SAMPLE_CHAT.active;
  const goal = d.goal || SAMPLE_CHAT.goal;
  const steps = d.steps || SAMPLE_CHAT.steps;

  return (
    <div data-cv6kit style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--ground)', color: 'var(--fg)', fontFamily: 'var(--font-sans)', height: '100dvh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes barGlow { 0%,100%{opacity:.85;} 50%{opacity:1;} }
        @keyframes livePulse { 0%,100%{opacity:1;} 50%{opacity:.5;} }
      `}</style>

      {/* Status bar */}
      <div style={{ height: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 24px 6px', fontSize: 15, fontWeight: 600 }}>
        <span>9:41</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>/007</span>
      </div>

      {/* Canonical mobile header: .mback left · .mhtitle · .mhactions (search then menu) */}
      <CvgMobileHeader
        title={active.name}
        sub="working · step 3 of 4"
        onBack={d.onBack}
        onSearch={d.onSearch}
        onMenu={d.onMenu}
      />

      {/* Thread */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px 0' }}>
        {/* Goal header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{ICON.target}</span>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Goal:</span> {goal.title}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{goal.done}/{goal.total}</span>
        </div>

        {/* Steps */}
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          const hasLine = !last && s.kind !== 'upnext';
          const transparent = s.kind === 'done' || s.kind === 'upnext';

          return (
            <div key={s.id} style={{ position: 'relative', paddingLeft: 50, paddingBottom: 16 }}>
              {hasLine && <span style={{ position: 'absolute', left: 18, top: 38, bottom: -4, width: 2, background: 'var(--divider)' }} />}
              <div style={{ position: 'absolute', left: 0, top: 0 }}>
                <StepIcon kind={s.kind} userInitial={active.initials} />
              </div>
              <div style={{
                borderRadius: 13,
                padding: transparent ? '7px 0 0' : '12px 13px',
                background: s.kind === 'choice' ? 'var(--accent-weak)' : transparent ? 'transparent' : 'var(--surface)',
                border: s.kind === 'choice' || transparent ? 'none' : '1px solid var(--hair)',
              }}>
                {s.kind === 'choice' ? (
                  <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>{s.title}</span>
                    {s.sub && <span> {s.sub}</span>}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: transparent && s.kind === 'upnext' ? 'var(--muted)' : 'var(--fg)' }}>{s.title}</span>
                      {s.statusLabel && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: 20,
                          color: s.kind === 'done' ? 'var(--success)' : s.kind === 'snag' ? 'var(--warn)' : 'var(--accent)',
                          background: s.kind === 'done' ? 'var(--success-weak)' : s.kind === 'snag' ? 'var(--warn-weak, rgba(251,191,36,.16))' : 'var(--accent-weak)',
                        }}>
                          {s.statusLabel}
                        </span>
                      )}
                    </div>
                    {s.sub && <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)', marginTop: 3 }}>{s.sub}</div>}

                    {/* Choices - mobile vertical */}
                    {s.choices && s.choices.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 11 }}>
                        {s.choices.map((c) => (
                          <div key={c.id} style={{
                            borderRadius: 12,
                            padding: '11px 12px',
                            background: c.recommended ? 'var(--accent)' : 'var(--surface-2)',
                            border: c.recommended ? 'none' : '1px solid var(--hair)',
                            cursor: 'pointer',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: c.recommended ? '#fff' : 'var(--fg)' }}>
                              {c.recommended ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>}
                              <span>{c.title}{c.recommended ? ' · Recommended' : ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Progress bar */}
                    {s.progress && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 10 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
                          <div style={{ width: `${s.progress.pct}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),#6366F1)' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>{s.progress.label}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ height: 16 }} />
      </div>

      {/* Composer */}
      <div style={{ flex: 'none', position: 'absolute', left: 0, right: 0, bottom: 0, borderTop: '1px solid var(--divider)', padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ground)' }}>
        <button style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>{ICON.mic}</button>
        <div style={{ flex: 1, height: 42, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 14, color: 'var(--faint)' }}>Nudge {active.name}, or jump in…</div>
        <button style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>{ICON.send}</button>
      </div>
    </div>
  );
}

export function ChatView({ isDesktop = false, activeTool = 'chat', onNav, user = {}, ...data }) {
  if (isDesktop) {
    return <DesktopChat data={data} onNav={onNav} user={user} />;
  }
  return <MobileChat data={data} onNav={onNav} user={user} />;
}

export default ChatView;
