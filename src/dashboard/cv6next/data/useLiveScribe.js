// cv6next — Live Scribe hook for meeting capture with real audio recording.
// Records audio in 15-second chunks, transcribes each chunk via Gemini
// (/api/dashboard/v2-transcribe-audio), extracts action items + decisions every
// 3rd chunk (/api/dashboard/livescribe-sessions action:extract), and saves the
// finished session (action:save → cm_state kind='dash_livescribe').
//
// Fixed 2026-07-06 (corner:corner-ui-cv6 — "Scribe buttons do nothing"):
//   1. blobToBase64 spread a whole 15s chunk through String.fromCharCode(...arr)
//      — a ~200KB argument spread that threw RangeError (max call stack) on every
//      real chunk, so no transcription ever landed. Now chunked conversion.
//   2. The template only renders transcript turns in data-state="ready", but the
//      hook reported state='recording' (no such branch) — the live transcript was
//      invisible while recording, and stop reset to 'empty' which erased it from
//      view. The hook now reports a TEMPLATE state (empty|loading|ready|error);
//      whether we're capturing rides data.session.capturing.
//   3. Turn timestamps came from a stale `elapsed` closure (always 00:00) and the
//      final chunk's async transcription raced saveSession. Refs + a pending-work
//      queue fix both: stop awaits outstanding transcriptions before resolving.
//   4. Confidence was a hardcoded '95%' — fabricated; Gemini returns none. Removed.
//
// Returns { state, data, controls: { start, stop, sendSummary } }.

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '../../lib/authFetch';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Convert an audio blob to base64 WITHOUT spreading the whole buffer through the
// call stack (a 15s webm chunk is far past the argument-spread limit).
async function blobToBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const STEP = 0x8000; // 32KB slices keep fromCharCode argument counts safe
  for (let i = 0; i < buf.length; i += STEP) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + STEP));
  }
  return btoa(binary);
}

export function useLiveScribe(worldId = 'aom') {
  // phase = the machine's truth: idle | starting | recording | error
  const [phase, setPhase] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [turns, setTurns] = useState([]); // [{at, text}, ...]
  const [actionItems, setActionItems] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [notice, setNotice] = useState(''); // one-line status for save/send feedback

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const chunkCountRef = useRef(0);
  const sessionIdRef = useRef(null);
  const sessionStartedRef = useRef(null);
  const transcriptRef = useRef(''); // running full transcript
  const elapsedRef = useRef(0);
  const turnsRef = useRef([]);
  const actionItemsRef = useRef([]);
  const decisionsRef = useRef([]);
  const pendingRef = useRef([]); // in-flight chunk transcriptions

  const pushTurn = (turn) => {
    turnsRef.current = [...turnsRef.current, turn];
    setTurns(turnsRef.current);
  };
  const mergeExtracted = (ai, d) => {
    if (Array.isArray(ai) && ai.length) {
      const merged = [...actionItemsRef.current];
      for (const item of ai) if (item && item.text && !merged.find((m) => m.text === item.text)) merged.push(item);
      actionItemsRef.current = merged.slice(0, 20);
      setActionItems(actionItemsRef.current);
    }
    if (Array.isArray(d) && d.length) {
      const merged = [...decisionsRef.current];
      for (const item of d) if (item && item.text && !merged.find((m) => m.text === item.text)) merged.push(item);
      decisionsRef.current = merged.slice(0, 20);
      setDecisions(decisionsRef.current);
    }
  };

  const extractNow = useCallback(async () => {
    if (!transcriptRef.current || transcriptRef.current.trim().length < 12) return;
    try {
      const res = await authFetch('/api/dashboard/livescribe-sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract', world: worldId, transcript: transcriptRef.current }),
      });
      if (res && res.ok) {
        const { actionItems: ai, decisions: d } = await res.json();
        mergeExtracted(ai, d);
      }
    } catch (err) {
      console.error('[useLiveScribe] extract error:', err);
    }
  }, [worldId]);

  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return;
    try {
      setNotice('');
      setPhase('starting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      sessionIdRef.current = 'sess-' + Date.now().toString(36);
      sessionStartedRef.current = new Date().toISOString();

      const mimeType = (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm'))
        ? 'audio/webm' : '';
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      chunkCountRef.current = 0;
      elapsedRef.current = 0;
      setElapsed(0);
      turnsRef.current = []; setTurns([]);
      actionItemsRef.current = []; setActionItems([]);
      decisionsRef.current = []; setDecisions([]);
      transcriptRef.current = '';
      pendingRef.current = [];

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);

      // Every 15s chunk: transcribe; every 3rd chunk, extract items/decisions.
      mediaRecorder.ondataavailable = (event) => {
        if (!event.data || !event.data.size) return;
        chunkCountRef.current += 1;
        const chunkNo = chunkCountRef.current;
        const at = formatTime(elapsedRef.current);
        const work = (async () => {
          try {
            const base64 = await blobToBase64(event.data);
            const res = await authFetch('/api/dashboard/v2-transcribe-audio', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio_base64: base64, mime_type: mediaRecorder.mimeType || 'audio/webm' }),
            });
            if (res && res.ok) {
              const { text } = await res.json();
              if (text && text.trim()) {
                pushTurn({ at, text: text.trim() });
                transcriptRef.current += `${transcriptRef.current ? '\n' : ''}${text.trim()}`;
                if (chunkNo % 3 === 0) await extractNow();
              }
            }
          } catch (err) {
            console.error('[useLiveScribe] transcribe error:', err);
          }
        })();
        pendingRef.current.push(work);
      };

      mediaRecorder.start(15000);
      setPhase('recording');
    } catch (err) {
      console.error('[useLiveScribe] recording error:', err);
      setPhase('error');
      setNotice(err && err.name === 'NotAllowedError'
        ? 'Microphone blocked — allow mic access in the browser and try again'
        : 'Could not start the microphone');
    }
  }, [worldId, extractNow]);

  const saveSession = useCallback(async () => {
    if (!sessionIdRef.current || !turnsRef.current.length) return false;
    try {
      const session = {
        id: sessionIdRef.current,
        started: sessionStartedRef.current || new Date().toISOString(),
        ended: new Date().toISOString(),
        target: 'Meeting',
        status: 'completed',
        turns: turnsRef.current,
        actionItems: actionItemsRef.current,
        decisions: decisionsRef.current,
      };
      const res = await authFetch('/api/dashboard/livescribe-sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', world: worldId, session }),
      });
      return Boolean(res && res.ok);
    } catch (err) {
      console.error('[useLiveScribe] save error:', err);
      return false;
    }
  }, [worldId]);

  // Stop capture, wait for in-flight chunk transcriptions, run a final extract,
  // and save the session. The transcript STAYS on screen (state → ready).
  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    setNotice('Wrapping up — transcribing the last piece…');
    await new Promise((resolve) => {
      mediaRecorder.onstop = resolve;
      mediaRecorder.stop();
    });
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    // ondataavailable fires before onstop, but its async transcription may still
    // be in flight — wait for every chunk so the last words make the transcript.
    await Promise.allSettled(pendingRef.current);
    pendingRef.current = [];
    if (transcriptRef.current && chunkCountRef.current % 3 !== 0) await extractNow();
    setPhase('idle');
    if (turnsRef.current.length) {
      const saved = await saveSession();
      setNotice(saved
        ? 'Recording saved. Transcript below — send it when you are ready.'
        : 'Recording stopped. Saving failed — the transcript is still here; try Send again.');
    } else {
      setNotice('Recording stopped. Nothing was heard, so there is no transcript.');
    }
  }, [extractNow, saveSession]);

  // Save the session and copy a markdown summary to the clipboard.
  const sendSummary = useCallback(async () => {
    if (!turnsRef.current.length) {
      setNotice('Nothing captured yet — record something first.');
      return false;
    }
    const saved = await saveSession();
    const lines = ['## Meeting Summary', '', `Duration: ${formatTime(elapsedRef.current)}`, ''];
    if (actionItemsRef.current.length) {
      lines.push('### Action Items');
      for (const ai of actionItemsRef.current) lines.push(`- [ ] ${ai.text}${ai.owner ? ` (@${ai.owner})` : ''}`);
      lines.push('');
    }
    if (decisionsRef.current.length) {
      lines.push('### Decisions');
      for (const d of decisionsRef.current) lines.push(`- ${d.text}`);
      lines.push('');
    }
    lines.push('### Transcript');
    for (const t of turnsRef.current) lines.push(`[${t.at}] ${t.text}`);
    let copied = false;
    try { await navigator.clipboard.writeText(lines.join('\n')); copied = true; } catch { /* clipboard blocked */ }
    setNotice(saved
      ? (copied ? 'Session saved · summary copied to your clipboard' : 'Session saved (clipboard blocked — copy manually)')
      : 'Could not save the session — check your connection and try again');
    return saved;
  }, [saveSession]);

  // Cleanup on unmount: stop the mic; nothing keeps recording in the background.
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* already stopped */ }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const recording = phase === 'recording';
  // TEMPLATE state: the design's branches are ready|empty|loading|error. Turns on
  // screen = ready (recording or not); mic prompt = loading; else honest empty.
  const state = phase === 'error' ? 'error'
    : phase === 'starting' ? 'loading'
      : (turns.length ? 'ready' : 'empty');

  const data = {
    session: {
      elapsed: formatTime(elapsed),
      target: 'Meeting',
      targetShort: 'Meeting',
      speakerCount: recording ? 1 : 0,
      // Drives the one capture button: idle shows Start (accent), recording shows
      // Stop & save (red). Recording only ever starts from a tap.
      capturing: recording ? 'on' : 'off',
      captureLabel: recording ? 'Stop & save' : 'Start capture',
      statusLine: notice
        || (recording
          ? 'Capturing — transcribing every 15 seconds'
          : 'Ready to capture. Press Start and speak.'),
    },
    transcript: turns.map((turn) => ({
      speaker: 'You',
      initials: 'Y',
      at: turn.at,
      text: turn.text,
      textHtml: turn.text,
      confidence: '', // Gemini returns no confidence — never fabricate one
    })),
    helper: {
      initials: 'AI',
      tint: 'violet',
      answerHtml: recording
        ? 'Listening — action items and decisions appear on the right as they are heard.'
        : 'Start a capture and the transcript builds here, with action items and decisions pulled out automatically.',
    },
    actionItems: actionItems.map((ai) => ({
      text: ai.text,
      textHtml: ai.text,
      owner: ai.owner || '—',
    })),
    decisions: decisions.map((d) => ({ text: d.text })),
    extracted: {
      actionCount: actionItems.length,
      decisionCount: decisions.length,
    },
    liveTurn: { speaker: 'You', initials: 'Y', at: formatTime(elapsed), text: '' },
  };

  return {
    state,
    recording,
    data,
    controls: {
      start: startRecording,
      stop: stopRecording,
      sendSummary,
    },
  };
}
