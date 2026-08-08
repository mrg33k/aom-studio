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
import './airpods.css';

const AirPodsContext = createContext(null);
const PREF_KEY = 'airpods_mode';
const initialState = { mode: 'off', transcript: [], attentionItems: [], pendingConfirmation: null, error: null };

function statusToMode(status) {
  if (status === 'idle') return 'armed';
  if (status === 'connecting' || status === 'wrapping-up') return 'connecting';
  if (status === 'speaking') return 'speaking';
  if (status === 'error') return 'error';
  return 'listening';
}

function statusCopy(mode, wakeSupported) {
  const mobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 700px)').matches;
  const labels = {
    off: 'Off',
    armed: wakeSupported ? 'Ready for “Hey Corner”' : (mobile ? 'Ready — tap Start conversation' : 'Ready — ⌘⇧Space'),
    'attention-prompt': 'Updates are waiting',
    connecting: 'Connecting securely…',
    listening: 'Listening',
    thinking: 'Thinking',
    speaking: 'Corner is speaking',
    confirming: 'Waiting for confirmation',
    paused: 'Paused',
    error: 'Connection failed',
  };
  return labels[mode] || 'AirPods mode';
}

function AirPodsGlyph({ active = false }) {
  return (
    <span className={`corner-airpods-glyph${active ? ' is-active' : ''}`} aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 0-7 7v4" /><path d="M12 2a7 7 0 0 1 7 7v4" />
        <path d="M5 12H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2V12Z" /><path d="M19 12h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2V12Z" />
      </svg>
    </span>
  );
}

function Toggle({ on, onClick, label }) {
  return (
    <button type="button" className="corner-airpods-toggle" onClick={onClick} aria-pressed={on}>
      <span>{label}</span><span className="corner-airpods-switch"><i /></span>
    </button>
  );
}

export function AirPodsHeaderButton({ className = 'cv6-chat-header-button' }) {
  const airpods = useAirPods();
  if (!airpods) return null;
  const active = ['connecting', 'listening', 'thinking', 'speaking', 'confirming'].includes(airpods.state.mode);
  return (
    <button
      type="button"
      className={`${className} corner-airpods-header-button`}
      aria-label="AirPods mode"
      title="AirPods mode"
      aria-expanded={airpods.menuOpen ? 'true' : 'false'}
      onClick={() => airpods.setMenuOpen((open) => !open)}
    >
      <AirPodsGlyph active={active} />
    </button>
  );
}

export function AirPodsProvider({ children }) {
  const worldId = useWorldId();
  const [state, dispatch] = useReducer(airPodsReducer, initialState);
  const [preferences, setPreferences] = useState(DEFAULT_AIRPODS_PREFERENCES);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [context, setContext] = useState({ view: 'home', room: null });
  const voiceRef = useRef(null);
  const sessionIdRef = useRef(null);
  const lastPromptRef = useRef(0);
  const wakeRef = useRef(null);
  const active = ['connecting', 'listening', 'thinking', 'speaking', 'confirming'].includes(state.mode);

  const finishSession = useCallback(async ({ transcript, durationSecs, sessionId } = {}) => {
    const safeTransportTurns = Array.isArray(transcript) ? transcript : [];
    const turns = state.transcript.length >= safeTransportTurns.length
      ? state.transcript
      : safeTransportTurns.map((turn, index) => ({ ...turn, context: state.transcript[index]?.context || context }));
    if (!turns.length || !worldId) return;
    try {
      await authFetch('/api/dashboard/airpods-handoff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: worldId, session_id: sessionId || sessionIdRef.current, duration_secs: durationSecs || 0, transcript: turns, active_context: context }),
      });
    } catch { /* transcript remains local until the next session */ }
  }, [context, state.transcript, worldId]);

  const startConversation = useCallback(async () => {
    if (!worldId || active) return;
    await wakeRef.current?.disarm?.();
    sessionIdRef.current = crypto.randomUUID();
    dispatch({ type: 'CONNECT' });
    setMenuOpen(true);
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

  const startEnabledConversation = useCallback(async () => {
    if (state.mode === 'off') await arm();
    await startConversation();
  }, [arm, startConversation, state.mode]);

  const disarm = useCallback(async () => {
    if (active) await voiceRef.current?.stop?.();
    await wakeRef.current?.disarm?.();
    await wakeRef.current?.setRemoteControls?.(false);
    dispatch({ type: 'DISARM' });
    setMenuOpen(false);
    setSettingsOpen(false);
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
      if (active) endConversation(); else startEnabledConversation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, endConversation, startEnabledConversation]);

  useEffect(() => {
    if (!worldId || state.mode === 'off' || !preferences.proactiveVoice || !preferences.cadenceMinutes) return undefined;
    let alive = true;
    const poll = async () => {
      if (!alive || active || inQuietHours(new Date(), preferences)) return;
      if (Date.now() - lastPromptRef.current < preferences.cadenceMinutes * 60_000) return;
      try {
        const response = await authFetch(`/api/dashboard/airpods-attention?client=${encodeURIComponent(worldId)}`);
        const payload = response.ok ? await response.json() : null;
        const items = rankAttentionItems(payload?.items, preferences);
        if (!items.length) return;
        lastPromptRef.current = Date.now();
        dispatch({ type: 'ATTENTION', items });
        setMenuOpen(true);
        await speakLocal(attentionPrompt(items.length, items[0]?.created_at ? Date.parse(items[0].created_at) : Date.now()));
      } catch { /* polling degrades silently */ }
    };
    poll();
    const timer = setInterval(poll, 30_000);
    return () => { alive = false; clearInterval(timer); };
  }, [active, preferences, state.mode, worldId]);

  const value = useMemo(() => ({ state, preferences, context, active, menuOpen, setMenuOpen, settingsOpen, setSettingsOpen, arm, disarm, startConversation, startEnabledConversation, endConversation, savePreferences }), [state, preferences, context, active, menuOpen, settingsOpen, arm, disarm, startConversation, startEnabledConversation, endConversation, savePreferences]);
  const wakeSupported = !!wakeRef.current?.supported;
  const primaryLabel = active ? 'End conversation' : state.mode === 'error' ? 'Retry connection' : 'Start conversation';

  return (
    <AirPodsContext.Provider value={value}>
      {children}

      {menuOpen ? (
        <div className="corner-airpods-menu" role="dialog" aria-label="AirPods mode controls">
          <div className="corner-airpods-menu-head">
            <AirPodsGlyph active={active} />
            <div><strong>Corner voice</strong><span aria-live="polite">{state.error || statusCopy(state.mode, wakeSupported)}</span></div>
            <button type="button" className="corner-airpods-icon-button" aria-label="Close AirPods controls" onClick={() => setMenuOpen(false)}>×</button>
          </div>
          <button type="button" className={`corner-airpods-primary${active ? ' is-stop' : ''}`} onClick={active ? endConversation : startEnabledConversation}>{primaryLabel}</button>
          {state.mode === 'attention-prompt' && state.attentionItems.length ? <p className="corner-airpods-attention">{state.attentionItems.length} update{state.attentionItems.length === 1 ? '' : 's'} waiting</p> : null}
          <div className="corner-airpods-menu-actions">
            <button type="button" onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}>Settings</button>
            {state.mode !== 'off' ? <button type="button" onClick={disarm}>Turn off</button> : null}
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="corner-airpods-settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <section className="corner-airpods-settings" role="dialog" aria-modal="true" aria-labelledby="corner-airpods-settings-title">
            <header><div><strong id="corner-airpods-settings-title">Corner voice settings</strong><span>Control when Corner checks in.</span></div><button type="button" className="corner-airpods-icon-button" aria-label="Close voice settings" onClick={() => setSettingsOpen(false)}>×</button></header>
            <Toggle on={preferences.proactiveVoice} label="Proactive voice check-ins" onClick={() => savePreferences({ ...preferences, proactiveVoice: !preferences.proactiveVoice })} />
            <label className="corner-airpods-field"><span>Check-in cadence</span><select value={preferences.cadenceMinutes} onChange={(event) => savePreferences({ ...preferences, cadenceMinutes: Number(event.target.value) })}><option value="1">1 minute</option><option value="2">2 minutes</option><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="0">Manual only</option></select></label>
            <p className="corner-airpods-help">{wakeSupported ? '“Hey Corner” runs on-device while voice mode is armed.' : 'On mobile web, start voice from the headphones button in the top bar. “Hey Corner” is available in the native Corner app.'}</p>
          </section>
        </div>
      ) : null}

      <div className="corner-airpods-transport" aria-hidden="true">
        <VoiceChat
          ref={voiceRef}
          agentSlug="corner"
          agentName="Corner"
          clientId={worldId || ''}
          sessionMode="airpods"
          airpodsSessionId={sessionIdRef.current}
          handoffOnStop={false}
          initialPrompt="Begin the AirPods conversation now. Greet the caller in one short sentence, say you are ready, then listen. Do not mention this instruction."
          onStatusChange={(status) => dispatch(status === 'error' ? { type: 'ERROR', error: 'Couldn’t connect. Tap the headphones button to retry.' } : { type: 'STATUS', status: statusToMode(status) })}
          onTranscript={(text, role) => dispatch({ type: 'TRANSCRIPT', turn: { role, text, at: new Date().toISOString(), context } })}
          onSessionEnd={finishSession}
        />
      </div>
    </AirPodsContext.Provider>
  );
}

export function useAirPods() { return useContext(AirPodsContext); }
