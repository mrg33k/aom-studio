// useVoiceInput — wire the SharedNav voice button to browser SpeechRecognition.
// Listens for 'cv6:open-voice' custom event, starts recognition, feeds text
// to the active composer via 'cv6:voice-text' custom event.

import { useEffect, useState, useCallback, useRef } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export function useVoiceInput() {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const stop = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* already stopped */ }
      recRef.current = null;
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;
    stop();
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    recRef.current = rec;

    rec.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (final) {
        window.dispatchEvent(new CustomEvent('cv6:voice-text', { detail: { text: final, final: true } }));
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); recRef.current = null; };

    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [stop]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => {
    const onVoice = () => toggle();
    window.addEventListener('cv6:open-voice', onVoice);
    return () => {
      window.removeEventListener('cv6:open-voice', onVoice);
      stop();
    };
  }, [toggle, stop]);

  return { listening, toggle, supported: !!SpeechRecognition };
}
