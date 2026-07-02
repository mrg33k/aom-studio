// cv6next — Live Scribe hook for meeting capture with real audio recording.
// Records audio in 15-second chunks, transcribes via Gemini, extracts items every 3rd chunk.
// Returns { state, data, controls: { start, stop, saveSession, elapsed } }

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '../../lib/authFetch';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Convert audio blob to base64
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const arr = new Uint8Array(reader.result);
      resolve(btoa(String.fromCharCode(...arr)));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

export function useLiveScribe(worldId = 'aom') {
  const [state, setState] = useState('empty'); // empty | recording | paused | error | ready
  const [elapsed, setElapsed] = useState(0);
  const [turns, setTurns] = useState([]); // [{at, text}, ...]
  const [actionItems, setActionItems] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [extractedCount, setExtractedCount] = useState({ actions: 0, decisions: 0 });

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const chunkCountRef = useRef(0);
  const sessionIdRef = useRef(null);
  const transcriptRef = useRef(''); // Running full transcript

  // Request microphone access
  const startRecording = useCallback(async () => {
    try {
      setState('loading');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      sessionIdRef.current = 'sess-' + Date.now().toString(36);

      // Create MediaRecorder with 15-second chunk size
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      chunkCountRef.current = 0;
      setElapsed(0);
      setTurns([]);
      setActionItems([]);
      setDecisions([]);
      setExtractedCount({ actions: 0, decisions: 0 });
      transcriptRef.current = '';

      // Timer for elapsed
      timerRef.current = setInterval(() => {
        setElapsed(t => t + 1);
      }, 1000);

      // On every 15-second chunk, transcribe and optionally extract
      mediaRecorder.ondataavailable = async (event) => {
        if (!event.data.size) return;

        chunkCountRef.current += 1;
        const blob = event.data;

        try {
          // Transcribe this chunk
          const base64 = await blobToBase64(blob);
          const transcribeRes = await fetch('/api/dashboard/v2-transcribe-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_base64: base64, mime_type: 'audio/webm' }),
          });

          if (transcribeRes.ok) {
            const { text } = await transcribeRes.json();
            if (text && text.trim()) {
              // Add turn to transcript
              const at = formatTime(elapsed);
              setTurns(prev => [...prev, { at, text }]);

              // Append to running transcript
              transcriptRef.current += `${transcriptRef.current ? '\n' : ''}${text}`;

              // Every 3rd chunk, extract action items and decisions
              if (chunkCountRef.current % 3 === 0) {
                try {
                  const extractRes = await authFetch('/api/dashboard/livescribe-sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'extract',
                      world: worldId,
                      transcript: transcriptRef.current,
                    }),
                  });

                  if (extractRes.ok) {
                    const { actionItems: ai, decisions: d } = await extractRes.json();
                    if (ai && Array.isArray(ai) && ai.length) {
                      setActionItems(ai);
                      setExtractedCount(prev => ({ ...prev, actions: ai.length }));
                    }
                    if (d && Array.isArray(d) && d.length) {
                      setDecisions(d);
                      setExtractedCount(prev => ({ ...prev, decisions: d.length }));
                    }
                  }
                } catch (err) {
                  console.error('[useLiveScribe] extract error:', err);
                }
              }
            }
          }
        } catch (err) {
          console.error('[useLiveScribe] transcribe error:', err);
        }
      };

      // Start recording with 15-second chunks
      mediaRecorder.start(15000);
      setState('recording');
    } catch (err) {
      console.error('[useLiveScribe] Recording error:', err);
      if (err.name === 'NotAllowedError') {
        setState('error');
      } else {
        setState('error');
      }
    }
  }, [elapsed]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = async () => {
        clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());

        // Extract final batch if not yet done
        if (transcriptRef.current && chunkCountRef.current % 3 !== 0) {
          try {
            const extractRes = await authFetch('/api/dashboard/livescribe-sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'extract',
                world: worldId,
                transcript: transcriptRef.current,
              }),
            });

            if (extractRes.ok) {
              const { actionItems: ai, decisions: d } = await extractRes.json();
              if (ai && Array.isArray(ai) && ai.length) {
                setActionItems(prev => {
                  const merged = [...prev];
                  for (const item of ai) {
                    if (!merged.find(m => m.text === item.text)) {
                      merged.push(item);
                    }
                  }
                  return merged.slice(0, 20);
                });
                setExtractedCount(prev => ({ ...prev, actions: ai.length }));
              }
              if (d && Array.isArray(d) && d.length) {
                setDecisions(prev => {
                  const merged = [...prev];
                  for (const item of d) {
                    if (!merged.find(m => m.text === item.text)) {
                      merged.push(item);
                    }
                  }
                  return merged.slice(0, 20);
                });
                setExtractedCount(prev => ({ ...prev, decisions: d.length }));
              }
            }
          } catch (err) {
            console.error('[useLiveScribe] final extract error:', err);
          }
        }

        setState('empty');
        resolve();
      };

      mediaRecorder.stop();
    });
  }, []);

  const saveSession = useCallback(async () => {
    if (!sessionIdRef.current) return false;

    try {
      const session = {
        id: sessionIdRef.current,
        started: new Date().toISOString(),
        target: 'Meeting',
        status: 'completed',
        turns,
        actionItems,
        decisions,
      };

      const res = await authFetch('/api/dashboard/livescribe-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          world: worldId,
          session,
        }),
      });

      if (!res.ok) {
        console.error('[useLiveScribe] save error:', res.status);
        return false;
      }

      // Clear after save
      sessionIdRef.current = null;
      return true;
    } catch (err) {
      console.error('[useLiveScribe] save error:', err);
      return false;
    }
  }, [worldId, turns, actionItems, decisions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Build data contract for template
  const data = {
    session: {
      elapsed: formatTime(elapsed),
      target: 'Meeting',
      targetShort: 'Meeting',
      speakerCount: state === 'recording' ? 1 : 0,
      // Drives the one capture button: idle shows Start (accent), recording
      // shows Stop & save (red). Recording only ever starts from a tap.
      capturing: state === 'recording' ? 'on' : 'off',
      captureLabel: state === 'recording' ? 'Stop & save' : 'Start capture',
      statusLine: state === 'recording'
        ? 'Capturing this meeting'
        : state === 'error'
          ? 'Microphone unavailable — allow mic access and try again'
          : 'Ready to capture. Press Start and speak.',
    },
    transcript: turns.map((turn, idx) => ({
      speaker: 'You',
      initials: 'Y',
      at: turn.at,
      text: turn.text,
      textHtml: turn.text,
      confidence: '95%',
    })),
    helper: {
      initials: '—',
      tint: 'violet',
      answerHtml: state === 'recording' ? 'Listening…' : 'Ready to record',
    },
    actionItems: actionItems.map(ai => ({
      text: ai.text,
      textHtml: ai.text,
      owner: ai.owner || '—',
    })),
    decisions: decisions.map(d => ({
      text: d.text,
    })),
    extracted: {
      actionCount: extractedCount.actions,
      decisionCount: extractedCount.decisions,
    },
    liveTurn: {
      speaker: 'You',
      initials: 'Y',
      at: formatTime(elapsed),
      text: '',
    },
  };

  return {
    state,
    data,
    controls: {
      start: startRecording,
      stop: stopRecording,
      saveSession,
      elapsed,
    },
  };
}
