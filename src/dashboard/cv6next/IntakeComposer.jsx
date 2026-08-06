// IntakeComposer — the Corner front-door box. corner:front-door Stage 3 + refine pass.
//
// A lean, room-LESS composer: type a task, pick Work/Plan, send. It does NOT
// reuse Cv6FullComposer (that requires an open room and its attachment/voice
// scope). Attachments/voice/image-gen belong INSIDE the room, after routing.
//
// Refine pass (Patrik's live use): the textarea grows as you type; when you start
// composing the recents digest below slides away (a class on the host, collapsed
// by a sibling rule in cv6.css); and while routing it shows a clean Corner-logo
// thinking modal instead of a bare spinner.

import { useCallback, useEffect, useRef, useState } from 'react';
import { CornerLoaderMark } from '../cv6kit/FullscreenLoading.jsx';

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
);

const THINKING = [
  'Reading your task…',
  'Finding the right room…',
  'Checking your projects…',
  'Lining up the work…',
];

export default function IntakeComposer({ onSubmit, busy = false, placeholder = 'Type a task, a question, or a half-formed idea…' }) {
  const [input, setInput] = useState('');
  const [interactionMode, setInteractionMode] = useState(() => {
    try { return localStorage.getItem('cv6.chatMode.intake') === 'plan' ? 'plan' : 'work'; } catch { return 'work'; }
  });
  const [focused, setFocused] = useState(false);
  const [thinkIdx, setThinkIdx] = useState(0);
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  const changeMode = useCallback((next) => {
    const v = next === 'plan' ? 'plan' : 'work';
    setInteractionMode(v);
    try { localStorage.setItem('cv6.chatMode.intake', v); } catch { /* private mode */ }
  }, []);

  // Auto-grow: the box extends with the text so long input stays visible.
  // Floor at one line: on mobile scrollHeight can read 0 before layout/fonts
  // settle, which collapsed the textarea to 0px and made the whole box untappable
  // (taps landed on the padding div, not the input). Never let it hit 0.
  const grow = useCallback((el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 24), 200)}px`;
  }, []);
  useEffect(() => { const el = inputRef.current; grow(el); requestAnimationFrame(() => grow(el)); }, [input, grow]);

  // Composing signal → the host gets `is-composing`, and a sibling rule in cv6.css
  // slides the recents digest away smoothly. Tied to CONTENT (not focus): on
  // mobile, collapsing on mere focus caused a layout jump right as the keyboard
  // opened, which dismissed focus before you could type. So the digest only
  // yields once you actually start typing.
  const composing = input.trim().length > 0 || busy;
  useEffect(() => {
    const host = rootRef.current?.parentElement;
    if (host) host.classList.toggle('is-composing', composing);
  }, [composing]);

  // Rotate the thinking text while routing.
  useEffect(() => {
    if (!busy) { setThinkIdx(0); return undefined; }
    const t = setInterval(() => setThinkIdx((i) => (i + 1) % THINKING.length), 1400);
    return () => clearInterval(t);
  }, [busy]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    onSubmit?.(text, interactionMode);
  }, [input, busy, interactionMode, onSubmit]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  // Auto-focus on DESKTOP only. On mobile, programmatic focus just fights the
  // keyboard (and never opens it without a gesture), so we leave the tap to the user.
  useEffect(() => {
    if (busy) return;
    try {
      if (typeof window !== 'undefined' && window.innerWidth >= 900) inputRef.current?.focus?.();
    } catch { /* not mounted */ }
  }, [busy]);

  const hasContent = input.trim().length > 0;

  return (
    <div ref={rootRef} className="cv6-intake-composer" style={{ width: '100%', maxWidth: 680, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      {/* The "What do you want to get done?" heading was removed (Patrik 2026-08-06)
          when the composer moved to the bottom of the front door — a headline under
          the recents list read as a caption for the list, not a prompt for the box. */}
      <div className="cv6-floating-composer" style={{ padding: 14, borderRadius: 26, background: 'var(--composer-solid, #131317)', border: '1px solid var(--hair)', boxShadow: '0 22px 52px -22px rgba(0,0,0,.88)' }}>
        {busy ? (
          <div className="cv6-intake-thinking" role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 6px' }}>
            <CornerLoaderMark className="cv6-intake-thinking-mark" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{THINKING[thinkIdx]}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Corner is picking the right room</div>
            </div>
          </div>
        ) : (
          <>
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
                style={{ flex: 1, minWidth: 0, resize: 'none', minHeight: 24, maxHeight: 200, overflowY: 'auto', background: 'none', border: 'none', outline: 'none', color: 'var(--fg)', fontSize: 16, lineHeight: 1.45, fontFamily: 'var(--font-sans)' }}
              />
            </div>
            <div data-role="composer-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <button type="button" className="cv6-mode-toggle"
                aria-label={`Currently in ${interactionMode} mode. Switch to ${interactionMode === 'plan' ? 'work' : 'plan'} mode`}
                title={interactionMode === 'plan' ? 'Plan mode: Corner proposes a plan and waits' : 'Work mode: Corner starts right away'}
                onClick={() => changeMode(interactionMode === 'plan' ? 'work' : 'plan')}
                style={{ height: 34, padding: '0 12px', borderRadius: 10, border: `1px solid ${interactionMode === 'plan' ? 'var(--accent)' : 'var(--hair)'}`, background: interactionMode === 'plan' ? 'var(--accent-weak)' : 'var(--surface-2)', color: interactionMode === 'plan' ? 'var(--accent)' : 'var(--muted)', font: '700 11.5px var(--font-sans)', cursor: 'pointer' }}>
                {interactionMode === 'plan' ? 'Plan' : 'Work'}
              </button>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {interactionMode === 'plan' ? 'Corner will propose a plan first' : 'Corner will get started'}
              </span>
              <span style={{ flex: 1 }} />
              <button type="button" title="Send" aria-label="Send" data-testid="cv6-intake-send" onClick={send} disabled={!hasContent}
                style={{ width: 44, height: 44, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: hasContent ? 'var(--accent)' : 'var(--surface-2)', border: hasContent ? 'none' : '1px solid var(--hair)', color: hasContent ? '#fff' : 'var(--faint)', cursor: hasContent ? 'pointer' : 'default', transition: 'background .18s' }}>
                <SendIcon />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
