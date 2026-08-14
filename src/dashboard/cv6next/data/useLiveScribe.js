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
// Fixed 2026-07-06 (mobile "spoke but no words appeared" — Patrik's real-mic test):
//   5. Capture used mediaRecorder.start(15000) — a TIMESLICE. Two fatal flaws that
//      broke the whole record→transcribe chain (worst on mobile, latent on desktop):
//        (a) Only the FIRST timeslice blob carries the container header; chunks 2+
//            are headerless continuation fragments. Each chunk is POSTed individually
//            to v2-transcribe-audio as a standalone file, so Gemini can decode chunk 1
//            and silently fails every chunk after — desktop only ever got the first 15s.
//        (b) iOS Safari has no webm (records audio/mp4, whose moov atom is written only
//            at finalize) and does not reliably fire ondataavailable on a timeslice
//            mid-recording — so on mobile a spoken word produces an undecodable fragment
//            or nothing at all, and no transcript ever appears.
//      Now each ~15s window is recorded by its OWN MediaRecorder (start → stop after
//      SEGMENT_MS → restart), so every uploaded chunk is a COMPLETE, self-contained,
//      decodable file with its own header — correct on desktop, Android, and iOS Safari.
//      Mime is picked from what the platform can actually record (webm→mp4 fallback).
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

// Length of one capture segment. Each segment is recorded by its own MediaRecorder so
// the delivered blob is a finalized, standalone file (see fix #5) — NOT a timeslice.
const SEGMENT_MS = 15000;

// Pick an audio container/codec the current platform can actually record. iOS Safari
// has no webm and falls back to audio/mp4; Android/desktop take webm/opus. Empty string
// lets the UA choose its own default (still a complete file per segment).
function pickAudioMime() {
  if (!(typeof window !== 'undefined' && window.MediaRecorder && MediaRecorder.isTypeSupported)) return '';
  const prefs = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/ogg'];
  return prefs.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export function useLiveScribe(worldId = null) {
  // phase = the machine's truth: idle | starting | recording | error
  const [phase, setPhase] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [turns, setTurns] = useState([]); // [{at, text}, ...]
  const [actionItems, setActionItems] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [notice, setNotice] = useState(''); // one-line status for save/send feedback
  const [errorName, setErrorName] = useState(''); // the real getUserMedia error name (for the error card's code line)

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
  const recordingActiveRef = useRef(false); // true for the whole capture, across segment restarts
  const startingRef = useRef(false);        // guards a double-tap during the getUserMedia await
  const mimeTypeRef = useRef('');           // chosen recorder mime (webm on most, mp4 on iOS Safari)
  const segmentTimerRef = useRef(null);     // ends the current ~15s segment

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

  // Transcribe ONE finished segment blob (a complete, standalone file) and push a turn.
  const transcribeSegment = useCallback((blob, mime) => {
    if (!blob || !blob.size) return;
    chunkCountRef.current += 1;
    const chunkNo = chunkCountRef.current;
    const at = formatTime(elapsedRef.current);
    const work = (async () => {
      try {
        const base64 = await blobToBase64(blob);
        const res = await authFetch('/api/dashboard/v2-transcribe-audio', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio_base64: base64, mime_type: mime || 'audio/webm' }),
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
  }, [extractNow]);

  // Record ONE segment: a fresh MediaRecorder, NO timeslice, stopped after SEGMENT_MS so
  // its single ondataavailable blob is a finalized, decodable file. onstop chains the next
  // segment while the capture is still active — a headerless-fragment-free loop that works
  // on iOS Safari (which finalizes mp4 on stop) as well as desktop/Android.
  const startSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || !recordingActiveRef.current) return;
    let rec;
    try {
      const mt = mimeTypeRef.current;
      rec = mt ? new MediaRecorder(stream, { mimeType: mt }) : new MediaRecorder(stream);
    } catch (err) {
      console.error('[useLiveScribe] MediaRecorder init failed:', err);
      recordingActiveRef.current = false;
      setPhase('error');
 setNotice('Could not start recording on this device, the browser blocked audio capture.');
      setErrorName('MediaRecorderUnsupported');
      return;
    }
    mediaRecorderRef.current = rec;
    rec.ondataavailable = (event) => {
      transcribeSegment(event.data, rec.mimeType || mimeTypeRef.current || 'audio/webm');
    };
    rec.onstop = () => {
      // Chain the next segment unless the capture was ended (stopRecording clears the flag).
      if (recordingActiveRef.current) startSegment();
    };
    try {
      rec.start(); // no timeslice → one complete blob delivered on stop()
    } catch (err) {
      console.error('[useLiveScribe] recorder start failed:', err);
      recordingActiveRef.current = false;
      setPhase('error');
 setNotice('Could not start recording on this device, the browser blocked audio capture.');
      setErrorName('RecorderStartFailed');
      return;
    }
    segmentTimerRef.current = setTimeout(() => {
      const r = mediaRecorderRef.current;
      if (r && r.state !== 'inactive') { try { r.stop(); } catch { /* already stopping */ } }
    }, SEGMENT_MS);
  }, [transcribeSegment]);

  const startRecording = useCallback(async () => {
    if (recordingActiveRef.current || startingRef.current) return;
    startingRef.current = true;
    try {
      setNotice('');
      setErrorName('');
      setPhase('starting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      sessionIdRef.current = 'sess-' + Date.now().toString(36);
      sessionStartedRef.current = new Date().toISOString();
      mimeTypeRef.current = pickAudioMime();

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

      recordingActiveRef.current = true;
      setPhase('recording');
      startSegment(); // begin the first segment (chains itself every SEGMENT_MS)
    } catch (err) {
      console.error('[useLiveScribe] recording error:', err);
      recordingActiveRef.current = false;
      setPhase('error');
      // The copy names the ACTUAL cause (Finder DEF-10: "check your connection" on a
      // NotFoundError sends the user to fix the wrong thing). getUserMedia error names:
      const name = (err && err.name) || '';
      setNotice(
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
 ? 'Microphone blocked, allow mic access in the browser and try again.'
          : name === 'NotFoundError' || name === 'DevicesNotFoundError'
 ? 'No microphone found, plug one in or pick an input in your sound settings, then try again.'
            : name === 'NotReadableError' || name === 'TrackStartError'
 ? 'The microphone is busy in another app, close it and try again.'
              : 'Could not start the microphone.'
      );
      setErrorName(name || 'unknown');
    } finally {
      startingRef.current = false;
    }
  }, [startSegment]);

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
    if (!recordingActiveRef.current && (!mediaRecorder || mediaRecorder.state === 'inactive')) return;
    // Clear the active flag FIRST so the current segment's onstop does NOT chain a new one.
    recordingActiveRef.current = false;
    if (segmentTimerRef.current) { clearTimeout(segmentTimerRef.current); segmentTimerRef.current = null; }
 setNotice('Wrapping up, transcribing the last piece…');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      await new Promise((resolve) => {
        mediaRecorder.onstop = resolve; // ondataavailable fires before this; flag already false
        try { mediaRecorder.stop(); } catch { resolve(); }
      });
    }
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
 ? 'Recording saved. Transcript below, send it when you are ready.'
 : 'Recording stopped. Saving failed, the transcript is still here; try Send again.');
    } else {
      setNotice('Recording stopped. Nothing was heard, so there is no transcript.');
    }
  }, [extractNow, saveSession]);

  // Save the session and copy a markdown summary to the clipboard.
  const sendSummary = useCallback(async () => {
    if (!turnsRef.current.length) {
 setNotice('Nothing captured yet, record something first.');
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
 ? (copied ? 'Session saved · summary copied to your clipboard' : 'Session saved (clipboard blocked, copy manually)')
 : 'Could not save the session, check your connection and try again');
    return saved;
  }, [saveSession]);

  // Cleanup on unmount: stop the mic; nothing keeps recording in the background.
  useEffect(() => () => {
    recordingActiveRef.current = false; // stop the segment chain
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
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
    loading: { label: 'Connecting to the meeting…' },
    // The error branch binds the REAL cause (never the sample "check your connection").
    errorNote: notice || 'Recording not available.',
    error: {
      title: 'Recording not available',
      body: notice || 'Could not start the microphone.',
      code: 'mic · ' + (errorName || 'error'),
    },
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
 ? 'Capturing, transcribing every 15 seconds'
          : 'Ready to capture. Press Start and speak.'),
    },
    transcript: turns.map((turn) => ({
      speaker: 'You',
      initials: 'Y',
      at: turn.at,
      text: turn.text,
      textHtml: turn.text,
 confidence: '', // Gemini returns no confidence, never fabricate one
    })),
    helper: {
      initials: 'AI',
      tint: 'violet',
      answerHtml: recording
 ? 'Listening, action items and decisions appear on the right as they are heard.'
        : 'Start a capture and the transcript builds here, with action items and decisions pulled out automatically.',
    },
    actionItems: actionItems.map((ai) => ({
      text: ai.text,
      textHtml: ai.text,
 owner: ai.owner || '·',
    })),
    decisions: decisions.map((d) => ({ text: d.text })),
    // Per-list empty placeholders (rendered via data-each: one row when the list is
    // empty, zero when populated). Driving them off the LIST — not the whole-screen
    // state — keeps "No action items yet." visible during recording and after a mic
    // error alike, instead of leaving a bare header (Finder: placeholder vanished on error).
    actionsEmpty: actionItems.length ? [] : [{}],
    decisionsEmpty: decisions.length ? [] : [{}],
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