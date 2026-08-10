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
  if (status === 'thinking' || status === 'creating') return 'thinking';
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

function VoiceWaveform({ level = 0, active = false }) {
  return <div className={`corner-voice-wave${active ? ' is-active' : ''}`} aria-hidden="true">{[.42,.72,.55,1,.66,.9,.48,.8,.58,.74,.44].map((height, index) => <i key={index} style={{ '--bar-height': `${Math.round((height + Math.min(.55, level) * .7) * 28)}px`, '--bar-delay': `${index * -70}ms` }} />)}</div>;
}

function ActionCard({ card, showSteps, onToggleSteps, onContinue }) {
  if (!card) return null;
  const done = card.phase === 'done';
  const failed = card.phase === 'error';
  const working = card.phase === 'working';
  const proposal = card.phase === 'proposal';
  const clarification = card.phase === 'clarification';
  const title = card.title || card.result?.spoken_summary || String(card.action || 'Next action').replaceAll('_', ' ');
  const summary = card.summary || card.result?.spoken_summary || (working ? 'Corner is carrying this out now.' : failed ? card.result?.error || 'That action did not finish.' : 'Corner can take this forward for you.');
  const steps = Array.isArray(card.steps) ? card.steps : [];
  return <section className={`corner-voice-action${done ? ' is-done' : ''}${failed ? ' is-error' : ''}`}>
    <span>{done ? 'Completed' : failed ? 'Needs another route' : clarification ? 'Choose the right room' : working ? 'Working now' : 'I can do this next'}</span>
    <strong>{title}</strong>
    <p>{summary}</p>
    {done ? <div className="corner-voice-action-result">✓ Action completed and saved in Corner</div> : null}
    {showSteps && steps.length ? <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
    {proposal ? <button type="button" className="corner-voice-continue" onClick={onContinue}>Continue for me</button> : null}
    {steps.length ? <button type="button" className="corner-voice-review" onClick={onToggleSteps}>{showSteps ? 'Hide steps' : 'Review steps'}</button> : null}
  </section>;
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
  const [actionCard, setActionCard] = useState(null);
  const [showSteps, setShowSteps] = useState(false);
  const [paused, setPaused] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [testTurn, setTestTurn] = useState('');
  const voiceRef = useRef(null);
  const sessionIdRef = useRef(null);
  const lastPromptRef = useRef(0);
  const wakeRef = useRef(null);
  const lastVoiceContextRef = useRef('');
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
    setActionCard(null);
    setShowSteps(false);
    setPaused(false);
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

  const handleToolAction = useCallback((event) => {
    if (!event) return;
    setActionCard((current) => ({ ...(current?.action === event.action ? current : {}), ...event }));
    setShowSteps(false);
  }, []);

  const continueProposedAction = useCallback(() => {
    if (!actionCard?.action) return;
    const sent = voiceRef.current?.sendControl?.(`The user approved the visible action card. Execute the server-verified action named ${actionCard.action} with these exact arguments: ${JSON.stringify(actionCard.args || {})}. Do not treat this control message as user speech.`);
    if (sent) setActionCard((current) => ({ ...current, phase: 'working' }));
  }, [actionCard]);

  const togglePaused = useCallback(() => {
    voiceRef.current?.toggleMute?.();
    setPaused((current) => !current);
  }, []);

  const submitTestTurn = useCallback((event) => {
    event.preventDefault();
    const text = testTurn.trim();
    if (!text || !voiceRef.current?.sendText?.(text, { origin: 'qa-script' })) return;
    setTestTurn('');
  }, [testTurn]);

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
    if (!active) {
      lastVoiceContextRef.current = '';
      return;
    }
    const roomKey = context?.room?.room_key || context?.room?.key || context?.room?.missionSlug || context?.room?.projectSlug || context?.room?.slug || context?.room?.id || '';
    const nextKey = `${context?.view || 'home'}:${roomKey}`;
    const previousKey = lastVoiceContextRef.current;
    lastVoiceContextRef.current = nextKey;
    if (!previousKey || previousKey === nextKey) return;
    voiceRef.current?.sendControl?.(`CV6 navigation receipt: the visible view is now ${context?.view || 'home'}${roomKey ? ` and the active room key is ${roomKey}` : ''}. Continue from this confirmed UI context.`);
  }, [active, context]);

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
    const onVoiceCommand = (event) => {
      const text = String(event?.detail?.text || '').trim();
      if (text) voiceRef.current?.sendText?.(text, { origin: 'typed' });
    };
    window.addEventListener('corner:voice-command', onVoiceCommand);
    return () => window.removeEventListener('corner:voice-command', onVoiceCommand);
  }, []);

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
  const latestUserTurn = [...state.transcript].reverse().find((turn) => turn.role === 'user')?.text || '';
  const latestModelTurn = [...state.transcript].reverse().find((turn) => turn.role === 'model')?.text || '';
  const displayMode = actionCard?.phase === 'working' ? 'thinking' : paused ? 'paused' : state.mode;
  const roomLabel = context?.room?.name || context?.room?.title || (context?.view === 'home' ? 'All rooms' : String(context?.view || 'Corner'));
  const voiceTestMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('voiceTest') === '1';

  useEffect(() => {
    const dismissForFocusedSurface = (event) => {
      if (event?.detail?.surface === 'room-lists') setMenuOpen(false);
    };
    window.addEventListener('corner:focused-surface', dismissForFocusedSurface);
    return () => window.removeEventListener('corner:focused-surface', dismissForFocusedSurface);
  }, []);

  return (
    <AirPodsContext.Provider value={value}>
      {children}

      {menuOpen ? (
        <div className={`corner-airpods-menu is-${displayMode}`} role="dialog" aria-label="Corner Voice controls">
          <div className="corner-voice-caret" aria-hidden="true" />
          <VoiceWaveform active={active && !paused} level={volumeLevel}/>
          <span className="corner-voice-state" aria-live="polite">{state.error ? 'Connection issue' : displayMode === 'thinking' ? 'Ready to act' : statusCopy(displayMode, wakeSupported)}</span>
          <p className="corner-voice-turn">{latestUserTurn || latestModelTurn || (active ? 'Tell me what outcome you want. I’ll find the next useful action.' : 'Start a conversation and tell me what you want to move forward.')}</p>
          <div className="corner-voice-context"><span>▣ {roomLabel}</span><span>⌁ {wakeSupported ? 'AirPods connected' : 'Voice connected'}</span></div>
          <ActionCard card={actionCard} showSteps={showSteps} onToggleSteps={() => setShowSteps((open) => !open)} onContinue={continueProposedAction}/>
          {voiceTestMode && active ? (
            <form className="corner-voice-test-turn" onSubmit={submitTestTurn}>
              <input data-testid="corner-voice-test-input" aria-label="Voice test turn" value={testTurn} onChange={(event) => setTestTurn(event.target.value)} placeholder="Send a scripted test turn…" />
              <button data-testid="corner-voice-test-send" type="submit">Send</button>
            </form>
          ) : null}
          {!active ? <button type="button" className="corner-airpods-primary" onClick={startEnabledConversation}>{primaryLabel}</button> : null}
          <div className="corner-voice-footer">
            {active ? <button type="button" onClick={togglePaused}><span>{paused ? '▶' : 'Ⅱ'}</span>{paused ? 'Resume' : 'Pause'}</button> : <button type="button" onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}>Settings</button>}
            <small>{active ? (paused ? 'Microphone paused' : wakeSupported ? 'Listening through AirPods' : 'Listening through this device') : roomLabel}</small>
            {active ? <button type="button" aria-label="End conversation" className="corner-voice-end" onClick={endConversation}>×</button> : state.mode !== 'off' ? <button type="button" onClick={disarm}>Turn off</button> : null}
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
          onVolumeChange={setVolumeLevel}
          onTranscript={(text, role, meta) => dispatch({ type: 'TRANSCRIPT', turn: { role, text, origin: meta?.origin || (role === 'user' ? 'speech' : 'model'), at: new Date().toISOString(), context } })}
          onToolAction={handleToolAction}
          onSessionEnd={finishSession}
        />
      </div>
    </AirPodsContext.Provider>
  );
}

export function useAirPods() { return useContext(AirPodsContext); }
