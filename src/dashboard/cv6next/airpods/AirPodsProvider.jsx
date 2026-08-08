import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import VoiceChat from '../../components/VoiceChat.jsx';
import { authFetch } from '../../lib/authFetch.js';
import { useWorldId } from '../../lib/tenantContext.jsx';
import {
  DEFAULT_AIRPODS_PREFERENCES,
  airPodsReducer,
  attentionPrompt,
  inQuietHours,
  normalizeAirPodsPreferences,
  rankAttentionItems,
} from './airpodsTypes.js';
import { createWakeWordAdapter, speakLocal } from './wakeWordAdapter.js';

const AirPodsContext = createContext(null);
const PREF_KEY = 'airpods_mode';

const initialState = {
  mode: 'off', transcript: [], attentionItems: [], pendingConfirmation: null, error: null,
};

function statusToMode(status) {
  if (status === 'idle') return 'armed';
  if (status === 'connecting' || status === 'wrapping-up') return 'connecting';
  if (status === 'speaking') return 'speaking';
  if (status === 'error') return 'error';
  return 'listening';
}

function statusCopy(mode, wakeSupported) {
  const labels = {
    off: 'AirPods mode off',
    armed: wakeSupported ? 'Say “Hey Corner”' : 'Ready · press ⌘⇧Space',
    'attention-prompt': 'Waiting for you',
    connecting: 'Connecting…',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Corner is speaking…',
    confirming: 'Waiting for confirmation',
    paused: 'Paused',
    error: 'Voice unavailable',
  };
  return labels[mode] || 'AirPods mode';
}

function Toggle({ on, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} style={{ border: 0, background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', width: '100%', gap: 10, padding: '8px 0', cursor: 'pointer', font: '600 12px var(--font-sans)' }}>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      <span style={{ width: 34, height: 19, padding: 2, borderRadius: 12, background: on ? 'var(--accent)' : 'var(--surface-2)', border: '1px solid var(--hair)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
        <span style={{ width: 13, height: 13, borderRadius: '50%', background: on ? '#fff' : 'var(--muted)' }} />
      </span>
    </button>
  );
}

export function AirPodsProvider({ children }) {
  const worldId = useWorldId();
  const [state, dispatch] = useReducer(airPodsReducer, initialState);
  const [preferences, setPreferences] = useState(DEFAULT_AIRPODS_PREFERENCES);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [context, setContext] = useState({ view: 'home', room: null });
  const voiceRef = useRef(null);
  const sessionIdRef = useRef(null);
  const lastPromptRef = useRef(0);
  const wakeRef = useRef(null);

  const active = ['connecting', 'listening', 'thinking', 'speaking', 'confirming'].includes(state.mode);

  const finishSession = useCallback(async ({ transcript, durationSecs, sessionId } = {}) => {
    // The provider's copy carries the CV6 room context captured with every turn;
    // VoiceChat's internal copy is the flush-safe fallback for a final partial turn.
    const safeTransportTurns = Array.isArray(transcript) ? transcript : [];
    const turns = state.transcript.length >= safeTransportTurns.length
      ? state.transcript
      : safeTransportTurns.map((turn, index) => ({ ...turn, context: state.transcript[index]?.context || context }));
    if (!turns.length || !worldId) return;
    try {
      await authFetch('/api/dashboard/airpods-handoff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: worldId,
          session_id: sessionId || sessionIdRef.current,
          duration_secs: durationSecs || 0,
          transcript: turns,
          active_context: context,
        }),
      });
    } catch { /* transcript remains local until the next session */ }
  }, [context, state.transcript, worldId]);

  const startConversation = useCallback(async () => {
    if (!worldId || active) return;
    await wakeRef.current?.disarm?.();
    sessionIdRef.current = crypto.randomUUID();
    dispatch({ type: 'CONNECT' });
    requestAnimationFrame(() => voiceRef.current?.start?.());
  }, [active, worldId]);

  const arm = useCallback(async () => {
    dispatch({ type: 'ARM' });
    setPreferences((current) => {
      const next = { ...current, enabled: true };
      if (worldId) authFetch('/api/dashboard/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: PREF_KEY, client_id: worldId, value: next }) }).catch(() => {});
      return next;
    });
    await wakeRef.current?.arm?.({ sensitivity: preferences.wakeSensitivity });
    await wakeRef.current?.setRemoteControls?.(true);
  }, [preferences.wakeSensitivity, worldId]);

  const disarm = useCallback(async () => {
    if (active) await voiceRef.current?.stop?.();
    await wakeRef.current?.disarm?.();
    await wakeRef.current?.setRemoteControls?.(false);
    dispatch({ type: 'DISARM' });
    setPreferences((current) => {
      const next = { ...current, enabled: false };
      if (worldId) authFetch('/api/dashboard/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: PREF_KEY, client_id: worldId, value: next }) }).catch(() => {});
      return next;
    });
  }, [active, worldId]);

  const endConversation = useCallback(async () => {
    await voiceRef.current?.stop?.();
    if (preferences.enabled) await arm();
    else dispatch({ type: 'DISARM' });
  }, [arm, preferences.enabled]);

  useEffect(() => {
    wakeRef.current = createWakeWordAdapter({ onWake: () => startConversation() });
    return () => { wakeRef.current?.disarm?.(); wakeRef.current = null; };
  }, [startConversation]);

  useEffect(() => {
    if (!worldId) return;
    let alive = true;
    authFetch(`/api/dashboard/preferences?key=${encodeURIComponent(PREF_KEY)}&client=${encodeURIComponent(worldId)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!alive) return;
        const next = normalizeAirPodsPreferences(data?.value);
        setPreferences(next);
        if (next.enabled) {
          dispatch({ type: 'ARM' });
          // Restoring the visible state is not enough on native builds: the
          // recognizer and lock-screen media controls must be re-armed too.
          wakeRef.current?.arm?.({ sensitivity: next.wakeSensitivity }).catch(() => {});
          wakeRef.current?.setRemoteControls?.(true).catch(() => {});
        }
      }).catch(() => {});
    return () => { alive = false; };
  }, [worldId]);

  const savePreferences = useCallback((next) => {
    const value = normalizeAirPodsPreferences(next);
    setPreferences(value);
    if (worldId) authFetch('/api/dashboard/preferences', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: PREF_KEY, client_id: worldId, value }),
    }).catch(() => {});
  }, [worldId]);

  useEffect(() => {
    const onContext = (event) => setContext(event.detail || { view: 'home', room: null });
    window.addEventListener('cv6:airpods-context', onContext);
    return () => window.removeEventListener('cv6:airpods-context', onContext);
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (!(event.metaKey && event.shiftKey && event.code === 'Space')) return;
      event.preventDefault();
      if (state.mode === 'off') { arm().then(startConversation); return; }
      if (active) endConversation(); else startConversation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, arm, endConversation, startConversation, state.mode]);

  useEffect(() => {
    if (!worldId || state.mode === 'off' || !preferences.proactiveVoice || !preferences.cadenceMinutes) return undefined;
    let alive = true;
    const poll = async () => {
      if (!alive || active || inQuietHours(new Date(), preferences)) return;
      const elapsed = Date.now() - lastPromptRef.current;
      if (elapsed < preferences.cadenceMinutes * 60_000) return;
      try {
        const response = await authFetch(`/api/dashboard/airpods-attention?client=${encodeURIComponent(worldId)}`);
        const payload = response.ok ? await response.json() : null;
        const items = rankAttentionItems(payload?.items, preferences);
        if (!items.length) return;
        lastPromptRef.current = Date.now();
        dispatch({ type: 'ATTENTION', items });
        await speakLocal(attentionPrompt(items.length, items[0]?.created_at ? Date.parse(items[0].created_at) : Date.now()));
      } catch { /* polling degrades silently */ }
    };
    poll();
    const timer = setInterval(poll, 30_000);
    return () => { alive = false; clearInterval(timer); };
  }, [active, preferences, state.mode, worldId]);

  const value = useMemo(() => ({ state, preferences, context, arm, disarm, startConversation, endConversation, savePreferences }), [state, preferences, context, arm, disarm, startConversation, endConversation, savePreferences]);
  const wakeSupported = !!wakeRef.current?.supported;

  return (
    <AirPodsContext.Provider value={value}>
      {children}
      <div data-airpods-mode="" style={{ position: 'fixed', left: 14, bottom: 'max(14px, env(safe-area-inset-bottom, 0px))', zIndex: 120, fontFamily: 'var(--font-sans, Inter, sans-serif)' }}>
        {state.mode === 'off' ? (
          <button type="button" onClick={arm} aria-label="Turn on AirPods mode" title="AirPods mode · ⌘⇧Space" style={{ width: 46, height: 46, borderRadius: 16, border: '1px solid var(--hair, rgba(255,255,255,.14))', background: 'var(--surface, #13171d)', color: 'var(--muted, #9ca3af)', boxShadow: '0 12px 30px rgba(0,0,0,.32)', cursor: 'pointer', fontSize: 20 }}>◉</button>
        ) : (
          <div style={{ width: 'min(360px, calc(100vw - 28px))', borderRadius: 17, border: '1px solid var(--hair)', background: 'var(--composer-solid, var(--surface))', color: 'var(--fg)', boxShadow: '0 18px 44px rgba(0,0,0,.38)', padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <button type="button" onClick={active ? endConversation : startConversation} aria-label={active ? 'End voice conversation' : 'Talk to Corner'} style={{ width: 38, height: 38, borderRadius: 13, border: 0, background: active ? 'var(--accent)' : 'var(--accent-weak)', color: active ? '#fff' : 'var(--accent)', cursor: 'pointer', fontSize: 17 }}>{active ? '■' : '●'}</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 750 }}>Corner · AirPods mode</div>
                <div aria-live="polite" style={{ marginTop: 2, fontSize: 11, color: state.error ? 'var(--danger, #e5484d)' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{state.error || statusCopy(state.mode, wakeSupported)}</div>
              </div>
              <button type="button" onClick={() => setSettingsOpen((open) => !open)} aria-label="AirPods settings" style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer' }}>⚙</button>
              <button type="button" onClick={disarm} aria-label="Turn off AirPods mode" style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer' }}>×</button>
            </div>
            {state.mode === 'attention-prompt' && state.attentionItems.length ? (
              <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
                <button type="button" onClick={startConversation} style={{ flex: 1, height: 34, borderRadius: 10, border: 0, background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>I have a minute</button>
                <button type="button" onClick={() => dispatch({ type: 'ARM' })} style={{ height: 34, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer' }}>Later</button>
              </div>
            ) : null}
            {settingsOpen ? (
              <div style={{ marginTop: 10, borderTop: '1px solid var(--hair)', padding: '8px 4px 2px' }}>
                <Toggle on={preferences.proactiveVoice} label="Proactive voice check-ins" onClick={() => savePreferences({ ...preferences, proactiveVoice: !preferences.proactiveVoice })} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 12, fontWeight: 600 }}>
                  <span style={{ flex: 1 }}>Check-in cadence</span>
                  <select value={preferences.cadenceMinutes} onChange={(event) => savePreferences({ ...preferences, cadenceMinutes: Number(event.target.value) })} style={{ height: 30, borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)' }}>
                    <option value="1">1 min</option><option value="2">2 min</option><option value="5">5 min</option><option value="15">15 min</option><option value="0">Manual</option>
                  </select>
                </label>
                <div style={{ fontSize: 10.5, lineHeight: 1.4, color: 'var(--faint)' }}>{wakeSupported ? '“Hey Corner” runs on-device while armed.' : 'Local wake-word adapter is not configured here. Use ⌘⇧Space or the talk button.'}</div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <div style={{ display: 'none' }}>
        <VoiceChat
          ref={voiceRef}
          agentSlug="corner"
          agentName="Corner"
          clientId={worldId || ''}
          sessionMode="airpods"
          airpodsSessionId={sessionIdRef.current}
          handoffOnStop={false}
          onStatusChange={(status) => dispatch(status === 'error' ? { type: 'ERROR', error: 'Voice connection failed.' } : { type: 'STATUS', status: statusToMode(status) })}
          onTranscript={(text, role) => dispatch({ type: 'TRANSCRIPT', turn: { role, text, at: new Date().toISOString(), context } })}
          onSessionEnd={finishSession}
        />
      </div>
    </AirPodsContext.Provider>
  );
}

export function useAirPods() {
  return useContext(AirPodsContext);
}
