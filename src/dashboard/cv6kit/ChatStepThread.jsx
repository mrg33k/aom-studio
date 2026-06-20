import React from 'react';

/**
 * CV6 kit Chat — the graphical "Step Thread" (mobile). Renders an agent
 * conversation as a vertical timeline of steps (done / snag+decision / your
 * choice / working+progress / up next) instead of flat bubbles. Kit-faithful to
 * ui_kits/tools/chat.html (mobile frame).
 *
 * Props are shaped for REAL data so this plugs into the live step-emission feed
 * when it exists (today the live chat streams flat messages — see BUILD.md
 * R-KIT-5; this view is verified in isolation, not yet grafted live):
 *   target   = { name, initials, statusLine }
 *   steps[]  = { id, kind, title, sub, statusLabel, choices?, progress?, byUser? }
 *              kind: 'done' | 'snag' | 'choice' | 'working' | 'upnext'
 *              choices[] = { id, title, sub, recommended }
 *              progress  = { pct, label }
 *   onBack(), onSend(text), onChoice(stepId, choiceId)
 */

const ICON = {
  back: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>,
  warn: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17v.01" /><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /></svg>,
  spin: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'cv6spin 1.1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>,
  line: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>,
  thread: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" /><path d="m9 14 2 2 4-4" /></svg>,
  redo: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>,
  chev: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>,
  mic: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  send: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></svg>,
};

const ICO_BG = { done: 'var(--success-weak)', snag: 'var(--warn-weak, rgba(251,191,36,.16))', working: 'var(--accent-weak)', upnext: 'var(--chip)' };
const PILL = {
  snag: { color: 'var(--warn)', background: 'var(--warn-weak, rgba(251,191,36,.16))' },
  working: { color: 'var(--accent)', background: 'var(--accent-weak)' },
  done: { color: 'var(--success)', background: 'var(--success-weak)' },
  upnext: { color: 'var(--faint)', background: 'var(--chip)' },
};

function StepIcon({ kind }) {
  if (kind === 'choice') {
    return <div style={{ position: 'absolute', left: 0, top: 0, width: 34, height: 34, borderRadius: '50%', flex: 'none', zIndex: 1, background: 'var(--avatar)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>P</div>;
  }
  const glyph = kind === 'done' ? ICON.check : kind === 'snag' ? ICON.warn : kind === 'working' ? ICON.spin : ICON.line;
  return <div style={{ position: 'absolute', left: 0, top: 0, width: 34, height: 34, borderRadius: '50%', flex: 'none', zIndex: 1, background: ICO_BG[kind] || 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{glyph}</div>;
}

export function ChatStepThread({ target = {}, steps = [], onBack, onSend, onChoice, composerPlaceholder }) {
  const [draft, setDraft] = React.useState('');
  const send = () => { const t = draft.trim(); if (t && onSend) onSend(t); setDraft(''); };

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      <style>{'@keyframes cv6spin{to{transform:rotate(360deg)}}@keyframes cv6bar{0%,100%{opacity:.85}50%{opacity:1}}'}</style>

      {/* header — safe-area top */}
      <div style={{ flex: 'none', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)', display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px', borderBottom: '1px solid var(--divider)' }}>
        <div onClick={onBack} role="button" aria-label="Back" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>{ICON.back}</div>
        <div style={{ position: 'relative', flex: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{target.initials || '?'}</div>
          <span style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: 'var(--success)', border: '2px solid var(--ground)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{target.name || 'Room'}</div>
          {target.statusLine && <div style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{target.statusLine}</div>}
        </div>
      </div>

      {/* thread */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
          {ICON.thread}
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>Step Thread</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#fff', background: 'linear-gradient(135deg,var(--accent),#6366F1)', padding: '4px 9px', borderRadius: 7 }}>Live</span>
        </div>

        {steps.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius-card)', fontSize: 13.5, color: 'var(--muted)' }}>No steps yet. The thread fills in as the agent works.</div>
        ) : steps.map((s, i) => {
          const last = i === steps.length - 1;
          const transparent = s.kind === 'done' || s.kind === 'upnext';
          return (
            <div key={s.id || i} style={{ position: 'relative', paddingLeft: 46, paddingBottom: 16 }}>
              {!last && <span style={{ position: 'absolute', left: 16, top: 36, bottom: -4, width: 2, background: 'var(--divider)' }} />}
              <StepIcon kind={s.kind} />
              <div style={{
                borderRadius: 14,
                padding: transparent ? '6px 0 0' : '12px 13px',
                background: s.kind === 'choice' ? 'var(--accent-weak)' : transparent ? 'transparent' : 'var(--surface)',
                border: s.kind === 'choice' ? '1px solid var(--accent-weak)' : transparent ? 'none' : '1px solid var(--hair)',
              }}>
                {s.kind === 'choice' ? (
                  <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5 }}><span style={{ fontWeight: 600 }}>{s.title}</span>{s.sub ? ' — ' + s.sub : ''}</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: transparent && s.kind === 'upnext' ? 'var(--muted)' : 'var(--fg)' }}>{s.title}</span>
                      {s.statusLabel && <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, ...(PILL[s.kind] || PILL.upnext) }}>{s.statusLabel}</span>}
                    </div>
                    {s.sub && <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)', marginTop: 3 }}>{s.sub}</div>}

                    {Array.isArray(s.choices) && s.choices.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 11 }}>
                        {s.choices.map((c) => (
                          <div key={c.id} onClick={() => onChoice && onChoice(s.id, c.id)} style={{ padding: '11px 12px', borderRadius: 12, cursor: 'pointer', background: c.recommended ? 'var(--accent)' : 'var(--surface-2)', border: c.recommended ? '1px solid transparent' : '1px solid var(--hair)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: c.recommended ? '#fff' : 'var(--fg)' }}>
                              <span style={{ color: c.recommended ? '#fff' : 'var(--muted)', display: 'inline-flex' }}>{c.recommended ? ICON.redo : ICON.chev}</span>
                              {c.title}{c.recommended ? ' · Recommended' : ''}
                            </div>
                            {c.sub && <div style={{ fontSize: 11.5, lineHeight: 1.4, marginTop: 4, color: c.recommended ? 'rgba(255,255,255,.85)' : 'var(--muted)' }}>{c.sub}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {s.progress && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 10 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
                          <div style={{ width: `${s.progress.pct || 0}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),#6366F1)', animation: 'cv6bar 1.6s ease-in-out infinite' }} />
                        </div>
                        {s.progress.label && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>{s.progress.label}</span>}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* composer — safe-area bottom */}
      <div style={{ flex: 'none', borderTop: '1px solid var(--divider)', padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ground)' }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={composerPlaceholder || `Nudge ${target.name || 'the agent'}, or jump in...`}
          style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', padding: '0 14px', fontSize: 15, fontFamily: 'var(--font-sans)', outline: 'none' }}
        />
        <button onClick={send} aria-label="Send" style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>{draft.trim() ? ICON.send : ICON.mic}</button>
      </div>
    </div>
  );
}
