// cv6next — Live Scribe data hook for meeting capture sessions.
// Returns { state, data } shaped to the livescribe template contract.
// Honest about what's real vs held-c: transcription service (backend), speaker diarization,
// confidence % are all marked held-c (not wired). The UI shows demo/sample data structure
// for development. No fake rows; empty/loading/error states handled truthfully.

import { useState, useEffect, useCallback } from 'react';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function tintFor(seed) {
  const TINTS = ['accent', 'success', 'violet'];
  let h = 0;
  for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function useLiveScribe(worldId = 'aom') {
  const [sessions, setSessions] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | loaded | error

  const load = useCallback(async () => {
    // HELD-C: No backend yet. For now, return the sample structure so the UI mounts
    // correctly. In production, this would poll /api/dashboard/livescribe-sessions
    // and fetch the active recording transcript, helper messages, extracted items.
    try {
      // Simulate async load
      await new Promise((resolve) => setTimeout(resolve, 300));

      // HELD-C: no transcription backend, so there is never a live session. Report the
      // honest 'empty' state so the screen shows "Waiting for the meeting to start" +
      // "No action items / decisions yet" rather than a blank ready panel. When the
      // backend lands, a live session flips this to 'ready'.
      const activeSessions = [];
      setSessions(activeSessions);
      setStatus('empty');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  // Sample data structure (for testing the UI shell):
  // When a real session is active, it would populate these fields from the backend.
  // For now, shape empty state so the UI mounts without error.
  const session = sessions?.[0] || null;

  // Honest empty state: no fabricated transcript rows
  const data = {
    session: session || {
      elapsed: '00:00',
      target: 'Corner → Dashboard',
      targetShort: 'Dashboard',
      speakerCount: 0,
    },
    transcript: [], // HELD-C: transcription service provides speaker turns
    helper: {
      initials: '—',
      tint: 'violet',
      answerHtml: 'Waiting for meeting to start…',
    },
    actionItems: [], // auto-extracted, HELD-C: backend diarization + NLP
    decisions: [],   // auto-extracted, HELD-C: backend extraction
    extracted: {
      actionCount: 0,
      decisionCount: 0,
      newCount: 0,
    },
    liveTurn: {
      speaker: '',
      initials: '',
      speakerTint: 'accent',
      at: '',
      text: '',
    },
  };

  return { state: status, data, reload: load };
}
