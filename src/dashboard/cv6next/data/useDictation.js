// cv6next — voice dictation for the chat composer (P15).
// Uses the browser's built-in SpeechRecognition (Web Speech API). REAL and frontend-only:
// no backend, no faked transcript. The mic transcribes the user's speech into the composer
// text, which the user still reviews and sends. Honest about capability: on browsers without
// SpeechRecognition the hook reports supported:false and the caller hides the mic (no dead
// button). Tapping while listening stops; final results append to the existing draft.

import { useState, useRef, useEffect, useCallback } from 'react';

const SR =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const dictationSupported = !!SR;

// onText(finalText) is called with each finalized utterance (already trimmed).
export function useDictation(onText) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  // Abort any in-flight recognition on unmount so the mic never stays hot.
  useEffect(() => () => {
    try { recRef.current?.abort(); } catch { /* no-op */ }
  }, []);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* no-op */ }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SR) return;
    let rec = recRef.current;
    if (!rec) {
      rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
      rec.onresult = (e) => {
        let text = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) text += e.results[i][0].transcript;
        }
        text = text.trim();
        if (text) onTextRef.current?.(text);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
    }
    try {
      rec.start();
      setListening(true);
    } catch {
      // start() throws if already running; treat as a no-op.
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported: dictationSupported, listening, toggle };
}
