// RoomWorkList — what is happening in THIS room right now (Patrik 2026-08-06).
//
// His distinction, and the whole reason this exists: background work to the SYSTEM and
// background work to the USER are different things. The system's version is "a job was
// dispatched to a sub-agent". The user's version is "anything happening after I asked
// for it" — which includes the room's own agent working through steps without
// dispatching anything. The old card only knew the system's version, so a room could be
// visibly busy and show nothing, or show a single row for a dozen moving parts.
//
// So this merges three sources into ONE projection:
//   this room  — the room agent's own goal steps (done / working / next)
//   sub-agent  — dispatched jobs and promised come-backs (useRunningTasks)
//   this turn  — the live bridge step, falling back to the user's latest ask
//
// Shape follows the action-items list Patrik screenshotted: a checkbox, a SHORT label,
// nothing else. Plus the thing he asked for that the screenshot didn't have — a live
// counter per item, so "how long has this been going" is answerable at a glance.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRunningTasks } from './data/useRunningTasks.js';
import { currentTurnWorkLabel, liveWorkLabels } from './data/roomWorkProjection.js';
import { actionGlyph } from './ChatGoalThread.jsx';

// Elapsed as the shortest true thing: 42s, 7m, 1h04.
function elapsedLabel(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h${String(mins % 60).padStart(2, '0')}`;
}

// One short line. Long agent prose is the thing Patrik explicitly does not want here.
function shorten(text, max = 58) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

// Admission gate: block prose chat filler that is not a real action item.
// "I'll let you know", "Sounds like a plan", "Noted" → not items.
// Concrete tasks ("Review the draft", "Deploy to staging") → pass through.
const PROSE_PREFIXES = /^(i['']?(ll|ve|m|d|will|have|am)|we['']?(ll|ve|d|re|will|have|are)|sounds|let me know|happy to|please note|sure[.,!]|got it|noted|thanks|thank you|understood|will do|no problem|of course|great[.,!])/i;
function isActionItem(text) {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 4) return false;
  if (PROSE_PREFIXES.test(t)) return false;
  return true;
}

// Humanize the "who owns this" label. 'this room' is obvious in a room-scoped
// panel — hide it. 'sub-agent' is jargon — map to 'In progress'.
function humanizeOwner(owner) {
  if (!owner || owner === 'this room') return '';
  if (owner === 'sub-agent') return 'In progress';
  return owner;
}

function roomKeyFor(room) {
  if (!room) return '';
  if (room.isMission) return `m:${room.missionSlug || room.id}`;
  if (room.isProject) return `p:${room.id}`;
  return `a:${room?.id || ''}`;
}

// The room agent's steps have no timestamps — they are a checklist, not a job queue. So
// the first time we SEE a step working, we stamp it and keep that stamp in localStorage,
// which is what makes the counter survive a reload. It is an observation, not a claim
// about when the agent truly began, and it is deliberately never back-dated.
function useStepStarts(roomKey, activeLabels) {
  const [, force] = useState(0);
  const store = useRef({});
  const storeKey = `cv6.workstart.${roomKey}`;

  useEffect(() => {
    try { store.current = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { store.current = {}; }
    force((n) => n + 1);
  }, [storeKey]);

  useEffect(() => {
    if (!roomKey) return;
    let changed = false;
    const now = Date.now();
    for (const label of activeLabels) {
      if (!store.current[label]) { store.current[label] = now; changed = true; }
    }
    // Drop stamps for steps that are no longer running, so the file cannot grow forever.
    for (const label of Object.keys(store.current)) {
      if (!activeLabels.includes(label)) { delete store.current[label]; changed = true; }
    }
    if (changed) {
      try { localStorage.setItem(storeKey, JSON.stringify(store.current)); } catch { /* private mode */ }
      force((n) => n + 1);
    }
  }, [roomKey, storeKey, activeLabels.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return store.current;
}

function Box({ state }) {
  const common = { width: 18, height: 18, borderRadius: 5, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  if (state === 'done') {
    // Circular filled tick — matches approved render (corner-actions-amplify.png)
    return (
      <span style={{ ...common, background: 'var(--success)', color: '#fff', borderRadius: '50%', marginTop: 1 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span style={{ ...common, border: '1.5px solid var(--accent)', color: 'var(--accent)' }}>
        <span className="cv6-worklist-spin" style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', display: 'block' }} />
      </span>
    );
  }
  return <span style={{ ...common, border: '1.5px solid var(--hair)' }} />;
}

// State-title phrases cycled by wall-clock bucket so the card reads as alive, not frozen.
// Identical to LIVE_OPENERS in ChatGoalThread.jsx — kept local to avoid a cross-import.
const STEP_CARD_OPENERS = ['Reading your message', 'Thinking it through', 'Working out the approach'];

// One-card inline view — renders when expandable=false (the chat scroll body).
// Patrik's ask: remove steps, animate them THROUGH the bar. One fixed-height card,
// cross-fading current/previous step text. §9c grants the structural-change exception.
//
// §5 compliance:
//   - If goal.checklist has real steps: progress = activeStepIndex/totalSteps (genuine N/M).
//   - Else (only synthetic awaiting or agent tasks with no count): indeterminate, no % or fill.
function StepCard({ roomSteps, agentItems, awaiting, awaitingSince, liveSteps, turnHealth, currentAsk, onStop = null }) {
  // --- data ---
  const totalSteps = roomSteps.length;
  const activeStepIdx = roomSteps.findIndex((s) => s.state === 'active');  // 0-based in checklist
  const activeStep = activeStepIdx >= 0 ? roomSteps[activeStepIdx] : null;
  const prevStep = activeStepIdx > 0 ? roomSteps[activeStepIdx - 1] : (roomSteps.filter((s) => s.state === 'done').slice(-1)[0] || null);
  const liveLabels = liveWorkLabels(liveSteps);
  const liveLabel = awaiting ? liveLabels[liveLabels.length - 1] : '';
  const previousLiveLabel = awaiting && liveLabels.length > 1 ? liveLabels[liveLabels.length - 2] : '';

  // Real measured progress: step N of M (1-based, genuine from checklist). §5 §5.
  const hasRealProgress = totalSteps > 0 && activeStepIdx >= 0;
  const stepN = hasRealProgress ? activeStepIdx + 1 : null; // 1-based
  const stepM = hasRealProgress ? totalSteps : null;
  const progressPct = hasRealProgress ? Math.round((stepN / stepM) * 100) : null;

  // The bridge's current activity is the freshest description while this turn is live.
  // Fall through to checklist/task truth, then name the user's ask instead of showing
  // an unexplained generic "Working" row.
  const activeLabel = liveLabel
    || activeStep?.label
    || (agentItems.length ? agentItems[0]?.label : null)
    || (awaiting ? currentTurnWorkLabel({ currentAsk }) : null)
    || '';

  // Previous done step label for the ghost cross-fade line.
  const prevLabel = previousLiveLabel || prevStep?.label || '';

  // Cold-spawn honesty (R-SMOOTHNESS Round D4): the turn is accepted but no
  // worker has produced a step after 8s — a quiet room is waking up, which can
  // take a minute. Say that, instead of cycling thinking phrases over dead air.
  const waking = awaiting && !liveLabel && !activeStep
    && turnHealth?.state === 'accepted'
    && awaitingSince && (Date.now() - awaitingSince > 3000);
  // Cycle LIVE_OPENERS by wall-clock so the card title feels alive — faster for snappy chat.
  const stateTitle = waking
    ? 'Waking the room'
    : STEP_CARD_OPENERS[Math.floor(Date.now() / 1200) % STEP_CARD_OPENERS.length];

  // Cross-fade: track previous active label so the ghost line renders on step change.
  // When activeLabel changes → save old to prevDisplayed (renders fading out) → clear after 220ms.
  const prevActiveLabelRef = useRef(activeLabel);
  const [fadingOutLabel, setFadingOutLabel] = useState('');
  useEffect(() => {
    if (activeLabel && prevActiveLabelRef.current && prevActiveLabelRef.current !== activeLabel) {
      setFadingOutLabel(prevActiveLabelRef.current);
      const t = setTimeout(() => setFadingOutLabel(''), 220);
      prevActiveLabelRef.current = activeLabel;
      return () => clearTimeout(t);
    }
    if (activeLabel) prevActiveLabelRef.current = activeLabel;
    return undefined;
  }, [activeLabel]);

  // The ghost line: prefer the fading-out label (step just changed) over the static prev step.
  // The static prevLabel only shows when the card first appears with steps already done.
  const ghostLabel = fadingOutLabel || (!fadingOutLabel && prevLabel && prevLabel !== activeLabel ? prevLabel : '');

  if (!activeLabel) return null;

  return (
    <div className="cv6-step-card" data-testid="cv6-step-card" data-cv6-live-work="">
      {/* Row 1: small spinner + state title + step counter */}
      <div className="cv6-sc-header">
        <span className="cv6-sc-spin" aria-hidden="true" />
        <span className="cv6-sc-title">{stateTitle}</span>
        {stepN != null && stepM != null && (
          <span className="cv6-sc-counter">Step {stepN} of {stepM}</span>
        )}
        {/* Round E: real Stop (bridge interrupt). Only offered while the turn is
            live and the feature answered available; 'stopping' is the engine's
            optimistic state and the server's row settles the truth. */}
        {onStop && awaiting ? (
          <button
            type="button"
            className="cv6-sc-stop"
            disabled={turnHealth?.state === 'stopping'}
            onClick={() => onStop()}
            title="Stop this turn"
            style={{ marginLeft: 'auto', flex: 'none', border: '1px solid var(--line, rgba(255,255,255,.14))', background: 'transparent', color: 'var(--muted)', borderRadius: 7, font: '600 11px var(--font-sans)', padding: '3px 9px', cursor: 'pointer' }}
          >{turnHealth?.state === 'stopping' ? 'Stopping…' : 'Stop'}</button>
        ) : null}
      </div>
      {/* Row 2: current step text — key change triggers CSS fadeIn. The glyph
          names WHAT the agent is doing (search/read/write/run/send), the same
          vocabulary done steps already use — the live row now reads as a tool
          card, not an anonymous line (R-SMOOTHNESS Round F). */}
      <div key={activeLabel} className="cv6-sc-current" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ flex: 'none', display: 'inline-flex', opacity: 0.75 }}>{actionGlyph(activeLabel)}</span>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{shorten(activeLabel, 72)}</span>
      </div>
      {/* Row 3: ghosted previous step — fades out via CSS, then unmounts */}
      {ghostLabel ? <div className="cv6-sc-prev">{shorten(ghostLabel, 72)}</div> : null}
      {/* Row 4: progress bar (determinate when real N/M available, indeterminate otherwise) */}
      <div className="cv6-sc-bar-row">
        <div className={`cv6-sc-bar${progressPct == null ? ' is-indeterminate' : ''}`}>
          <div
            className="cv6-sc-bar-fill"
            style={progressPct != null ? { width: `${progressPct}%` } : undefined}
          />
        </div>
        {progressPct != null && (
          <span className="cv6-sc-pct">{progressPct}%</span>
        )}
      </div>
    </div>
  );
}

// expandable — when true (dropdown mode) "+N more" is a button that expands the list.
export default function RoomWorkList({ room, goal, awaiting, awaitingSince, liveSteps, turnHealth, currentAsk, onStop = null, expandable = false }) {
  const { tasks, promises } = useRunningTasks(room);
  const [now, setNow] = useState(() => Date.now());
  const [localExpanded, setLocalExpanded] = useState(false);
  // Reset expanded state whenever the room changes so re-opening the dropdown on a
  // different room doesn't inherit the previous room's expanded state.
  const rKey = roomKeyFor(room);
  useEffect(() => { setLocalExpanded(false); }, [rKey]);

  const roomSteps = useMemo(() => {
    const list = Array.isArray(goal?.checklist) ? goal.checklist : [];
    return list
      .filter((s) => s.label && isActionItem(s.label))
      .map((s) => ({ key: `step:${s.label}`, label: s.label, state: s.state, owner: '', since: null }));
  }, [goal]);

  const activeLabels = useMemo(
    () => roomSteps.filter((s) => s.state === 'active').map((s) => s.label),
    [roomSteps],
  );
  const stepStarts = useStepStarts(roomKeyFor(room), activeLabels);

  const agentItems = useMemo(() => ([
    ...tasks.map((t) => ({ key: `task:${t.id}`, label: t.title, state: 'active', owner: '', since: t.since ? new Date(t.since).getTime() : null })),
    ...promises.map((p) => ({ key: `promise:${p.id}`, label: p.title, state: 'active', owner: '', since: p.since ? new Date(p.since).getTime() : null })),
  ]), [tasks, promises]);

  // A room's full step list is its whole history — 44 rows in Corner on the day this
  // shipped. That is the wall of text Patrik explicitly does not want. This panel answers
  // "what is happening NOW", so: every running item, a little of what just finished for
  // context, and a peek at what is next. Never more than 6 rows.
  //
  // Synthetic fallback (Patrik 2026-08-07): the room agent is mid-turn (awaiting=true)
  // but hasn't emitted a goal-thread checklist step yet. It inherits the current bridge
  // activity or the user's ask, so Action items never claims only "Working" with no object.
  // It still fires only when no more-specific active roomStep already covers the turn.
  const items = useMemo(() => {
    const hasActiveStep = roomSteps.some((s) => s.state === 'active');
    const synthetic = awaiting && !hasActiveStep
      ? [{ key: 'synthetic:working', label: currentTurnWorkLabel({ liveSteps, currentAsk }), state: 'active', owner: '', since: awaitingSince || null }]
      : [];
    const all = [...roomSteps, ...agentItems, ...synthetic];
    const active = all.filter((i) => i.state === 'active');
    if (!active.length) return [];
    const doneTail = roomSteps.filter((i) => i.state === 'done').slice(-2);
    // PENDING IS A PLAN, NOT WORK (Patrik 2026-08-07): "the action items are
    // filling up with things to do that aren't actually running… it should just
    // be showing things that actually get done." The resting panel used to
    // inject 2 pending steps as "next up", so a room with one thing running
    // read as a to-do list of things nobody had started. Pending is still
    // reachable — it's what the expanded dropdown and the "+N more" count are
    // for — but it no longer sits in the collapsed panel pretending to be
    // in-flight work.
    const nextUp = localExpanded ? roomSteps.filter((i) => i.state === 'pending') : [];
    const cap = localExpanded ? 100 : 6;
    return [...doneTail, ...active, ...nextUp].slice(0, cap);
  }, [roomSteps, agentItems, awaiting, awaitingSince, liveSteps, currentAsk, localExpanded]);
  const running = items.filter((i) => i.state === 'active').length;
  const remaining = roomSteps.filter((i) => i.state === 'pending').length - items.filter((i) => i.state === 'pending').length;

  // One shared tick for every counter, and only while something is actually running.
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Nothing running = no panel at all. A standing "Working" box on a quiet room is the
  // dead surface this is meant to replace, and a backlog is not work in flight.
  if (!items.length) return null;

  // Non-expandable = inline chat placement. Render the one fixed-height card (Patrik:
  // "remove steps and let them animate through that awesome loading bar you made").
  // §9c grants the structural-change exception for this one surface.
  if (!expandable) {
    return (
      <>
        <style>{'@keyframes cv6WorklistSpin{to{transform:rotate(360deg)}}.cv6-worklist-spin{animation:cv6WorklistSpin .45s linear infinite}'}</style>
        <StepCard
          roomSteps={roomSteps}
          agentItems={agentItems}
          awaiting={awaiting}
          awaitingSince={awaitingSince}
          liveSteps={liveSteps}
          turnHealth={turnHealth}
          currentAsk={currentAsk}
          onStop={onStop}
        />
      </>
    );
  }

  // Expandable = dropdown mode — now also single progress-bar card.
  // Patrik: steps animate THROUGH the bar, not as a list. Snappier chat.
  return (
    <>
      <style>{'@keyframes cv6WorklistSpin{to{transform:rotate(360deg)}}.cv6-worklist-spin{animation:cv6WorklistSpin .45s linear infinite}'}</style>
      <StepCard
        roomSteps={roomSteps}
        agentItems={agentItems}
        awaiting={awaiting}
        awaitingSince={awaitingSince}
        liveSteps={liveSteps}
        turnHealth={turnHealth}
        currentAsk={currentAsk}
        onStop={onStop}
      />
    </>
  );
}
