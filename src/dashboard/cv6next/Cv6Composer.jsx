// Cv6Composer — corner:corner-ui-cv6
//
// The CV6 quick-reply composer for the Home col3 conversation panel. The panel
// itself is template-driven (TemplateScreen injects the markup and re-binds on
// every message), so the composer can't live inside the template as React. It is
// kept mounted in CornerCV6's JSX and portaled into the template's `.composer`
// host node; because the component instance persists, the typed text survives a
// template re-bind (e.g. an agent reply landing while you're mid-sentence).
//
// Functionality mirrors CV4's ThreadInputBar for the part the quick-reply path
// can actually drive today: the pill, slash-command autocomplete (reusing the
// self-contained CV4 picker), Enter-to-send, and the send button. Attach + voice
// are not wired here — useRoomThread.send is text-only and voice is bound to
// CV4's chat context; those belong to the full Chat tool or a later data-path
// extension. CV6 theming layered via the .cv6composer-* classes in cv6.css.

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SlashCommandAutocomplete from '../components/cv3/SlashCommandAutocomplete.jsx';

export default function Cv6Composer({ target, onSend, placeholder = 'Message this room…', surface = 'project' }) {
  const [input, setInput] = useState('');
  const [caret, setCaret] = useState(null);
  const inputRef = useRef(null);
  const updateCaret = (e) => setCaret(e?.target?.selectionStart ?? null);

  const submit = useCallback(() => {
    const v = input.trim();
    if (!v || typeof onSend !== 'function') return;
    onSend(v);
    setInput('');
  }, [input, onSend]);

  if (!target) return null;
  const hasContent = input.trim().length > 0;

  return createPortal(
    <div className="cv6composer">
      {/* Slash-command autocomplete sits above the pill; it intercepts Enter/Tab
          in capture phase to select a skill, so our Enter-to-send only fires when
          the dropdown is closed (matches CV4). */}
      <SlashCommandAutocomplete
        value={input}
        setValue={setInput}
        inputRef={inputRef}
        caret={caret}
        surface={surface}
      />
      <input
        ref={inputRef}
        className="cv6composer-input"
        type="text"
        value={input}
        onChange={(e) => { setInput(e.target.value); updateCaret(e); }}
        onKeyUp={updateCaret}
        onClick={updateCaret}
        onSelect={updateCaret}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
        }}
        placeholder={placeholder}
      />
      <button
        type="button"
        className={`cv6composer-send${hasContent ? ' is-active' : ''}`}
        title="Send"
        onClick={submit}
        disabled={!hasContent}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />
        </svg>
      </button>
    </div>,
    target,
  );
}
