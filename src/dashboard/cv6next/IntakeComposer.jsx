// IntakeComposer — the Corner front-door box. corner:front-door Stage 3.
//
// A lean, room-LESS composer: type a task, pick Work/Plan, send. It does NOT
// reuse Cv6FullComposer (that requires an open room and its attachment/voice
// scope). Attachments/voice/image-gen belong INSIDE the room, after routing.
// Visual language matches the CV4/CV6 pill (cv6-floating-composer + the exact
// Work/Plan toggle from Cv6InputBar) so it reads as the same product.

import { useCallback, useEffect, useRef, useState } from 'react';

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
);

export default function IntakeComposer({ onSubmit, busy = false, placeholder = 'What do you want to get done? Type it and Corner opens the right room…' }) {
  const [input, setInput] = useState('');
  const [interactionMode, setInteractionMode] = useState(() => {
    try { return localStorage.getItem('cv6.chatMode.intake') === 'plan' ? 'plan' : 'work'; } catch { return 'work'; }
  });
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const changeMode = useCallback((next) => {
    const v = next === 'plan' ? 'plan' : 'work';
    setInteractionMode(v);
    try { localStorage.setItem('cv6.chatMode.intake', v); } catch { /* private mode */ }
  }, []);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || busy) return;
    // Clear on send — sending is the beat; the hook restores into the editable
    // confirm on any failure, so nothing typed is lost.
    setInput('');
    onSubmit?.(text, interactionMode);
  }, [input, busy, interactionMode, onSubmit]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  useEffect(() => { if (!busy) { try { inputRef.current?.focus?.(); } catch { /* not mounted */ } } }, [busy]);

  const hasContent = input.trim().length > 0;

  return (
    <div className="cv6-intake-composer" style={{ width: '100%', maxWidth: 680, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <div className="cv6-floating-composer" style={{ padding: 14, borderRadius: 26, background: 'var(--composer-solid, #131317)', border: '1px solid var(--hair)', boxShadow: '0 22px 52px -22px rgba(0,0,0,.88)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 54, borderRadius: 17, background: 'var(--composer-card-solid, var(--surface-2))', border: `1px solid ${focused ? 'var(--accent)' : 'var(--hair)'}`, boxShadow: focused ? '0 0 0 3px var(--accent-weak)' : 'none', transition: 'border-color .2s, box-shadow .2s', padding: '13px 15px' }}>
          <textarea
            ref={inputRef}
            data-testid="cv6-intake-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            disabled={busy}
            style={{ flex: 1, minWidth: 0, resize: 'none', maxHeight: 200, background: 'none', border: 'none', outline: 'none', color: 'var(--fg)', fontSize: 16, lineHeight: 1.45, fontFamily: 'var(--font-sans)' }}
          />
        </div>
        <div data-role="composer-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <button type="button" className="cv6-mode-toggle"
            aria-label={`Currently in ${interactionMode} mode. Switch to ${interactionMode === 'plan' ? 'work' : 'plan'} mode`}
            title={interactionMode === 'plan' ? 'Plan mode: Corner proposes a plan and waits' : 'Work mode: Corner starts right away'}
            onClick={() => changeMode(interactionMode === 'plan' ? 'work' : 'plan')}
            style={{ height: 42, padding: '0 15px', borderRadius: 21, border: `1px solid ${interactionMode === 'plan' ? 'var(--accent)' : 'var(--hair)'}`, background: interactionMode === 'plan' ? 'var(--accent-weak)' : 'var(--surface-2)', color: interactionMode === 'plan' ? 'var(--accent)' : 'var(--muted)', font: '700 12px var(--font-sans)', cursor: 'pointer' }}>
            {interactionMode === 'plan' ? 'Plan' : 'Work'}
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>
            {interactionMode === 'plan' ? 'Corner will propose a plan first' : 'Corner will get started'}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" title="Send" aria-label="Send" data-testid="cv6-intake-send" onClick={send} disabled={!hasContent || busy}
            style={{ width: 44, height: 44, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: (hasContent && !busy) ? 'var(--accent)' : 'var(--surface-2)', border: (hasContent && !busy) ? 'none' : '1px solid var(--hair)', color: (hasContent && !busy) ? '#fff' : 'var(--faint)', cursor: (hasContent && !busy) ? 'pointer' : 'default', transition: 'background .18s' }}>
            {busy
              ? <span className="cv6-intake-spin" style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', display: 'inline-block' }} />
              : <SendIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
