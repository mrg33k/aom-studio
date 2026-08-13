// cv6next — the live Goal Thread (agent-talk), mobile.
//
// The agent emits structured blocks on a message's metadata.blocks (step | success |
// data | choice | question, each keyed to a stepIndex). This renderer groups them by
// stepIndex and draws each result UNDER its step, matching the wired Chat kit
// (wired/tools/chat.html). The thread is built from REAL agent output: a step shows
// done/active/pending from its own state, never a timer, and each result attaches to
// the step that produced it. Choice/question taps and the composer post a real user
// message back into the room (no dead controls).
//
// Source of truth for the look: ccds6 wired/tools/chat.html (mobile screen) + cv6.css.
// We author the renderer (rather than mount the template) because each step TYPE has
// different markup, which a single data-each loop can't express.

import React, { useMemo, useState } from 'react';
import ChatMessageRenderer, { ChatInlineRenderer } from '../components/ChatMessageRenderer.jsx';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// blocks[] -> ordered steps, each owning its result blocks (grouped by stepIndex).
export function buildSteps(blocks) {
  if (!Array.isArray(blocks)) return [];
  const byIndex = new Map();
  const ensure = (i) => {
    const key = Number.isFinite(+i) ? +i : 0;
    if (!byIndex.has(key)) byIndex.set(key, { index: key, title: '', detail: '', state: 'pending', results: [], progress: null, kind: '' });
    return byIndex.get(key);
  };
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    const step = ensure(b.stepIndex);
    if (b.type === 'step') {
      step.title = b.title || step.title;
      step.detail = b.detail || step.detail;
      step.state = b.state || step.state;
      if (b.kind) step.kind = b.kind;
      if (b.progress != null) step.progress = b.progress;
    } else {
      step.results.push(b);
      // A step with no explicit step block still gets a heading from its first result.
      if (!step.title && b.title) step.title = b.title;
    }
  }
  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

// Opener phrases shown on the active row before the first real step lands, cycled by a
// wall-clock bucket so the strip reads as alive, not frozen on one static line. A real arc
// (read -> think -> plan), not three synonyms for "starting" — and never the retired dead
// phrase "Getting started" (Steffen design-gate 2026-07-21).
const LIVE_OPENERS = ['Reading your message', 'Thinking it through', 'Working out the approach'];

// Live message-steps (the agent's real tool activity, polled while a reply is pending) ->
// the same `blocks` shape buildSteps/GoalThreadBody render. This is what makes the thread
// BUILD live instead of appearing all-at-once at the end: each real step shows as a done
// row, the newest as the active (spinning) row, so steps tick in front of the user. Text is
// already humanized at the API (message-steps.js). When no step has arrived yet we show one
// active opener row (cycled, see LIVE_OPENERS) so the thread is born the instant you send and
// never looks dead. Steps reconcile to the agent's final metadata.blocks once the reply lands.
export function liveStepsToBlocks(liveSteps) {
  const real = (liveSteps || []).filter((s) => s && s.step_index !== 9999 && s.text && s.text !== 'settled');
  // Collapse to one row per step_index, keeping the latest text for that index.
  const byIdx = new Map();
  for (const s of real) {
    const k = Number.isFinite(+s.step_index) ? +s.step_index : 0;
    const t = s.timestamp ? new Date(s.timestamp).getTime() : 0;
    const prev = byIdx.get(k);
    if (!prev || t >= prev._t) byIdx.set(k, { text: s.text, _t: t });
  }
  const ordered = [...byIdx.values()].sort((a, b) => a._t - b._t);
  // Before the first real step lands (send -> bridge's opener, ~1-2s), don't freeze on a
  // single "Getting started" — the whole strip exists to show life, so cycle a few honest
  // openers so it always reads as moving, never stuck. The working turn re-renders every
  // ~1.5s (the step poll), so a wall-clock bucket advances the phrase on its own; the instant
  // a real step arrives this branch is skipped and the agent's actual steps take over.
  if (!ordered.length) {
    const phrase = LIVE_OPENERS[Math.floor(Date.now() / 2500) % LIVE_OPENERS.length];
    return [{ type: 'step', stepIndex: 0, title: phrase, state: 'active' }];
  }
  // Collapse consecutive identical labels into ONE row (Steffen design-gate): a stack of
  // identical done-rows is the visual signature of a stuck/looping process — the exact
  // opposite of what this strip is for. A repeated action shows as a single row.
  const deduped = [];
  for (const s of ordered) {
    if (deduped.length && deduped[deduped.length - 1].text === s.text) continue;
    deduped.push(s);
  }
  const last = deduped.length - 1;
  return deduped.map((s, i) => ({ type: 'step', stepIndex: i, title: s.text, state: i === last ? 'active' : 'done' }));
}

// THE one "agent is working" turn, shared by EVERY chat surface (full Chat tool, Home quick
// chat, mobile) so the live progress reads identically everywhere — on iff the room's agent is
// working this turn (driven by useRoomThread's `awaiting`).
//
// Patrik 2026-06-29: the thread IS the conversation. The user's message sits above; the agent's
// step thread BUILDS in front of you right below it — the agent's real steps tick in (done rows +
// a newest active, spinning row), the bar fills, and results attach as they land — exactly the
// step-thread kit animation (agent-chat/step-thread.html). Born the instant you send (one active
// "Getting started" row), reconciles to the agent's real steps as they arrive, unmounted by the
// caller the moment the turn settles. This REPLACES the 2026-06-28 bare moving-bar strip: that bar
// was added because the old WorkingTurn pre-listed every pending step and looked "half-built", but
// liveStepsToBlocks only ever yields steps that have ACTUALLY happened (+ one active row), so the
// thread reads as honest live progress, not a half-built checklist. `steps` is an alias for
// `liveSteps` (call-site compat); `goal` carries the user's ask so the header reads "Goal: <ask>".
export function WorkingTurn({ room, liveSteps, steps, goal }) {
  const blocks = liveStepsToBlocks(liveSteps || steps);
  return (
    <div data-cv6-live-work="" className="cv6-live-work" style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'flex-start' }}>
      <span className="ava is-green" style={{ width: 30, height: 30, fontSize: 11, flex: 'none', borderRadius: 9 }}>{room?.initials || '·'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {room?.name ? <div className="gname" style={{ marginBottom: 6 }}>{room.name}</div> : null}
        <GoalThreadBody goal={goal} blocks={blocks} header={false} />
      </div>
    </div>
  );
}

// Live draft bubble (R-SMOOTHNESS Round D): the agent's partial reply as it is
// being written, streamed from the bridge mirror via the engine's draft state.
// Ephemeral by contract — useRoomThread clears the draft in the same pass that
// renders the real persisted row, so the swap is one paint with no duplicate.
// Renders through the same markdown path as a real agent bubble.
export function StreamingDraft({ room, draft }) {
  if (!draft || !draft.text) return null;
  return (
    <div data-cv6-draft="" className="cv6-live-work" style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'flex-start' }}>
      <span className="ava is-green" style={{ width: 30, height: 30, fontSize: 11, flex: 'none', borderRadius: 9 }}>{room?.initials || '·'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {room?.name ? <div className="gname" style={{ marginBottom: 6 }}>{room.name}</div> : null}
        <div className="gsnote" style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)', wordBreak: 'break-word' }}>
          <ChatMessageRenderer content={draft.text} className="cv6-agent-prose" />
          <span className="cv6-draft-cursor" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

// data block -> generic cells + per-row chart pct (first numeric column, relative to max).
function normalizeData(b) {
  const columns = Array.isArray(b.columns) ? b.columns : [];
  const rawRows = Array.isArray(b.rows) ? b.rows : [];
  const rows = rawRows.map((r) => (Array.isArray(r) ? { cells: r } : { cells: r?.cells || [] }));
  const metricOf = (cells) => num(cells[1]);
  const max = rows.reduce((m, r) => Math.max(m, metricOf(r.cells)), 0);
  rows.forEach((r) => { r.pct = max > 0 ? Math.round((metricOf(r.cells) / max) * 100) : 0; });
  const totals = b.totals ? (Array.isArray(b.totals) ? { cells: b.totals } : { cells: b.totals.cells || [] }) : null;
  return { title: b.title || 'Data', columns, rows, totals };
}

// Pick a done-state icon that fits what the row is ABOUT, so a finished step or message reads
// by its action at a glance instead of a row of identical checks (Patrik 2026-06-30: use icons
// that apply to the action). Keyword match on the row text; falls back to a check. Stroke icons,
// currentColor, so they inherit the row's done/accent color from the kit CSS.
function actionGlyph(text) {
  const t = String(text || '').toLowerCase();
  const svg = (children) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
  if (/\b(ship|shipped|deploy|deployed|live|launch|launched|release|released|push|pushed|publish|published)\b/.test(t)) return svg(<><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>); // up — shipped/live
  if (/\b(search|find|found|look|looking|scan|scanned|explore|explored|grep|hunt|locate)\b/.test(t)) return svg(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>); // search
  if (/\b(read|reading|review|reviewed|inspect|inspected|check|checked|view|viewed|look over)\b/.test(t)) return svg(<><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></>); // eye — read/review
  if (/\b(write|wrote|edit|edited|updat|chang|fix|fixed|add|added|remov|creat|made|build|built|rename|renamed|refactor|implement|implemented|wire|wired)\b/.test(t)) return svg(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>); // pencil — make a change
  if (/\b(run|ran|test|tested|compile|compiled|verif|verified|confirm|confirmed|deploy check)\b/.test(t)) return svg(<path d="M8 5v14l11-7Z" />); // play — run/test
  if (/\b(send|sent|email|emailed|message|messaged|reply|replied|respond|responded|share|shared)\b/.test(t)) return svg(<path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />); // plane — send/reply
  if (/\?|\b(question|confirm|should i|which|want me|choose|decide|prefer)\b/.test(t)) return svg(<><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 .8-1 1.6" /><path d="M12 17h.01" /></>); // question
  return svg(<path d="m5 13 4 4L19 7" />); // check (default)
}

// The three step-state icons (pending ring / working spinner / done check). The kit's
// CSS (.gstep.is-* .gsico .i-*) reveals exactly one per step state, so we always render
// all three and let the class on the parent .gstep pick. Spinner spin comes from CSS too.
const StepIcons = (
  <span className="gsico">
    <span className="i-pend"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /></svg></span>
    <span className="i-work"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg></span>
    <span className="i-done"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg></span>
  </span>
);

// One step on the rail (real kit .gstep). State drives the icon + chip via CSS classes.
// Result blocks attach under the step in .gsattach (always shown when present, because a
// real result only exists because the agent emitted it — no demo show-on-done gate).
// Active/working steps render an inline progress bar showing real work in progress.
function StepRow({ step }) {
  const state = step.state === 'done' ? 'done' : (step.state === 'active' || step.state === 'working') ? 'active' : (step.state === 'queued') ? 'queued' : 'pending';
  const isActive = state === 'active';
  const isNote = step.kind === 'note';
  const hasProgress = step.progress != null;
  const progress = hasProgress ? Math.min(100, Math.max(0, step.progress)) : 0;
  // The done icon fits the row's action (search / edit / ship / …); pending + working keep the
  // kit's ring + spinner so a live turn still reads as progress. CSS reveals exactly one.
  const icons = (
    <span className="gsico">
      <span className="i-pend"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /></svg></span>
      <span className="i-work"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg></span>
      <span className="i-done">{actionGlyph(step.title)}</span>
    </span>
  );
  return (
    <div className={`gstep is-${state}`} data-step={step.index}>
      <div className="gsrail">
        {icons}
        <span className="gsline" />
      </div>
      <div className="gsbody">
        {isNote ? (
          <div className="gsnote" style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><ChatMessageRenderer content={step.title} className="cv6-agent-prose" /></div>
        ) : (
          <div>
            {/* Suppress the title when it's trivially "Done" — the chip already says so; showing
                both produces "Done. Done" which reads as escaped text, not a finished step. */}
            {!/^done\.?$/i.test((step.title || '').trim()) && (
              <span className="gstitle"><ChatInlineRenderer content={step.title || 'Step'} /></span>
            )}
            <span className="gschip c-work">Working</span>
            <span className="gschip c-done">Done</span>
            <span className="gschip c-queued">Queued</span>
          </div>
        )}
        {step.detail && !isNote ? <div className="gssub"><ChatMessageRenderer content={step.detail} className="cv6-agent-prose" /></div> : null}
        {isActive && step.detail ? (
          <div style={{ marginTop: 8, marginBottom: 6 }}>
            <div className={`cv6-live-progress${hasProgress ? ' is-determinate' : ' is-indeterminate'}`} style={{ position: 'relative', width: '100%', height: 22, borderRadius: 11, background: 'var(--surface-2)', overflow: 'hidden', border: '1px solid var(--hair)' }}>
              <i style={{ display: 'block', width: hasProgress ? `${progress}%` : '28%', height: '100%', background: 'var(--accent)', transition: 'width 0.3s ease' }} />
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 9px', color: 'var(--fg)', fontSize: 10.5, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px var(--ground)' }}><ChatInlineRenderer content={step.detail} /></span>
            </div>
          </div>
        ) : null}
        {step.results.length ? (
          <div className="gsattach step-in" style={{ display: 'block' }}>
            {step.results.map((r, i) => <Result key={i} block={r} />)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Result({ block }) {
  if (block.type === 'success') {
    return (
      <div className="cblk is-success" style={{ marginTop: 4 }}>
        <div className="cblk-h">
          <span className="ci"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg></span>
          <span className="ct"><ChatInlineRenderer content={block.title || 'Done'} /></span>
        </div>
        {block.detail ? <div className="cblk-b" style={{ fontSize: 12.5 }}><ChatMessageRenderer content={block.detail} className="cv6-agent-prose" /></div> : null}
      </div>
    );
  }
  if (block.type === 'snag') {
    return (
      <div className="cblk is-snag" style={{ marginTop: 4 }}>
        <div className="cblk-h">
          <span className="ci"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17v.01" /><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /></svg></span>
          <span className="ct"><ChatInlineRenderer content={block.title || 'Snag'} /></span>
        </div>
        {block.detail ? <div className="cblk-b" style={{ fontSize: 12.5 }}><ChatMessageRenderer content={block.detail} className="cv6-agent-prose" /></div> : null}
      </div>
    );
  }
  if (block.type === 'data') return <DataBlock block={block} />;
  if (block.type === 'choice') return <ChoiceBlock block={block} />;
  if (block.type === 'choiceEcho') return <ChoiceEchoBlock block={block} />;
  if (block.type === 'question') return <QuestionBlock block={block} />;
  if (block.type === 'email') return <EmailBlock block={block} />;
  if (block.type === 'summary') return <SummaryBlock block={block} />;
  if (block.type === 'artifact') return <ArtifactBlock block={block} />;
  if (block.type === 'audio') return <AudioBlock block={block} />;
  if (block.type === 'video') return <VideoBlock block={block} />;
  if (block.type === 'code') return <CodeBlock block={block} />;
  if (block.type === 'thinking') return <ThinkingBlock block={block} />;
  if (block.type === 'replies') return <RepliesBlock block={block} />;
  if (block.type === 'confirm') return <ConfirmBlock block={block} />;
  if (block.type === 'gallery') return <GalleryBlock block={block} />;
  return null;
}

// Tappable action chips shared by email/summary/media blocks — each posts the label as a
// real user message so the agent acts on it (no dead controls). `primaryFirst` makes the
// first chip the is-primary call to action. Exported so chat surfaces can render per-message
// suggestion chips (metadata.chips) in-thread without a separate panel.
export function ActionChips({ actions, primaryFirst = true }) {
  const list = Array.isArray(actions) ? actions.filter(Boolean) : [];
  const send = useThreadSend();
  if (!list.length) return null;
  return (
    <div className="chips">
      {list.map((a, i) => {
        const label = typeof a === 'string' ? a : (a.label || '');
        return <button key={i} className={`chip-btn ${primaryFirst && i === 0 ? 'is-primary' : ''}`} onClick={() => send(label)}>{label}</button>;
      })}
    </div>
  );
}

// A real email surfaced in chat (kit .cmail): from/subject, the ask quoted, an optional
// attachment row, and reply-via-agent action chips. We discuss email here; we don't compose.
function EmailBlock({ block }) {
  const atts = Array.isArray(block.attachments) ? block.attachments : [];
  const send = useThreadSend();
  const openReview = useThreadReview();
  return (
    <div className="cmail" style={{ marginTop: 4 }}>
      <div className="cmail-h">
        <span className="ma" style={{ background: 'rgba(244,114,182,.18)', color: '#F8A8D0' }}>{block.initials || (block.from || '·').slice(0, 2).toUpperCase()}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mfrom">{block.from || 'Sender'}{block.org ? ` · ${block.org}` : ''}</div>
          <div className="msub">{block.subject || ''}</div>
        </div>
        <span className="cmail-tag">Email</span>
      </div>
      {block.quote ? <div className="cmail-q"><ChatMessageRenderer content={block.quote} className="cv6-agent-prose" /></div> : null}
      {atts.length ? (
        <div style={{ padding: '0 14px 12px' }}>
          {atts.map((f, i) => (
            <div key={i} className="frowm" style={{ marginTop: i ? 8 : 0 }}>
              <span className="fg"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--pink-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{f.name || 'file'}</div>{f.size ? <div className="mono" style={{ fontSize: 10, color: 'var(--faint)' }}>{f.size}</div> : null}</div>
              {f.url ? <button className="pillbtn" onClick={() => openReview?.({ url: f.url, name: f.name || f.url })}>Review</button> : null}
            </div>
          ))}
        </div>
      ) : null}
      {block.flagged ? (
        <div className="cmail-f">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M4 22V4h13l-2 4 2 4H4" /></svg>
          <span style={{ flex: 1, fontSize: 11, color: 'var(--faint)' }}>{block.flagged}</span>
        </div>
      ) : null}
      {block.actions ? (
        <div style={{ padding: '0 14px 13px' }}><ActionChips actions={block.actions} /></div>
      ) : null}
    </div>
  );
}

// A digest of something long (kit .csum): scannable bullets + checkable action items +
// suggested next moves. Bullets flagged is-warn render in the warn color.
function SummaryBlock({ block }) {
  const bullets = Array.isArray(block.bullets) ? block.bullets : [];
  const actions = Array.isArray(block.actions) ? block.actions : [];
  return (
    <div style={{ marginTop: 4 }}>
      <div className="csum">
        <div className="csum-h">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" /></svg>
          <span className="se">Summary</span>
          {block.meta ? <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted)' }}>{block.meta}</span> : null}
        </div>
        <div className="csum-body">
          {block.headline ? (
            <div className="sheadline"><ChatMessageRenderer content={block.headline} className="cv6-agent-prose" /></div>
          ) : null}
          {bullets.map((b, i) => {
            const text = typeof b === 'string' ? b : (b.text || '');
            const warn = typeof b === 'object' && b.warn;
            return <div key={i} className={`sbullet${warn ? ' is-warn' : ''}`}><span className="sd" /><ChatMessageRenderer content={text} className="cv6-agent-prose" /></div>;
          })}
        </div>
        {actions.length ? (
          <div className="cact">
            <div className="eyebrow" style={{ marginBottom: 6 }}>Action items</div>
            {actions.map((a, i) => {
              const text = typeof a === 'string' ? a : (a.text || '');
              const done = typeof a === 'object' && a.done;
              return (
                <div key={i} className={`aitem${done ? ' is-done' : ''}`}>
                  <span className="ck">{done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: 1 }}><path d="m5 12 4 4L19 7" /></svg> : null}</span>
                  <span style={done ? { color: 'var(--muted)', textDecoration: 'line-through' } : undefined}><ChatInlineRenderer content={text} /></span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      {block.chips ? <ActionChips actions={block.chips} /> : null}
    </div>
  );
}

// Something the agent sends to show a result or confirm (kit .cartifact): a screenshot or
// live-site card with a Review action. Review opens the deliverable in the Review tool
// (pin-comment canvas) when the surface provides ReviewCtx; without it, a real attachment
// URL opens directly and a bare name falls back to asking the agent.
function ArtifactBlock({ block }) {
  const send = useThreadSend();
  const openReview = useThreadReview();
  const isShot = block.kind !== 'live';
  const onReview = () => {
    if (openReview && block.url) {
      openReview({ url: block.url, name: block.name || block.url, type: isShot ? '' : 'sitelive' });
      return;
    }
    send(`Open ${block.name || 'this'} in Review`);
  };
  return (
    <div className="cartifact" style={{ marginTop: 4 }}>
      {!isShot ? (
        <div className="cart-omni"><span className="lights"><i /><i /><i /></span><span className="url">{block.url || block.name || 'preview'}</span></div>
      ) : null}
      <div className={`cart-canvas${isShot ? ' is-shot' : ''}`} style={!isShot ? { aspectRatio: '16/9', background: 'linear-gradient(160deg,#101822,#0a0e14)' } : undefined}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={isShot ? '#c9ccd1' : 'rgba(255,255,255,.4)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
      </div>
      <div className="cart-bar">
        <span className="cart-kind">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
          {isShot ? 'Screenshot' : 'Live site'}
        </span>
        <span style={{ flex: 1, fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{block.name || ''}</span>
        <button className="review-btn" onClick={onReview}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
          Review
        </button>
      </div>
    </div>
  );
}

// A voice note (kit .caudio): play control + waveform + duration, with the transcript in a
// muted bubble below. Bars are a fixed visual; height comes from the block or a default set.
function AudioBlock({ block }) {
  const heights = Array.isArray(block.wave) && block.wave.length ? block.wave : [30, 60, 85, 50, 100, 70, 40, 80, 55, 95, 45, 65, 35, 75, 50, 90, 40, 60];
  const lit = Math.round(heights.length * 0.38);
  return (
    <div style={{ marginTop: 4 }}>
      <div className="caudio">
        <button className="play"><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M7 5l12 7-12 7Z" /></svg></button>
        <div className="wave">{heights.map((h, i) => <i key={i} className={i < lit ? 'on' : ''} style={{ height: `${h}%` }} />)}</div>
        {block.duration ? <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', flex: 'none' }}>{block.duration}</span> : null}
      </div>
      {block.transcript ? <div className="bubble" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}><ChatMessageRenderer content={block.transcript} className="cv6-agent-prose" /></div> : null}
    </div>
  );
}

// A video message (kit .cvideo): a clean poster with a play affordance + duration chip and
// an optional title, never a raw file dumped in the thread.
function VideoBlock({ block }) {
  return (
    <div className="cvideo" style={{ marginTop: 4 }}>
      <div className="vplay"><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5l11 7-11 7Z" /></svg></div>
      <div className="vmeta">
        {block.duration ? <span className="vchip">▶ {block.duration}</span> : <span />}
        <span style={{ flex: 1 }} />
        {block.title ? <span className="vchip">{block.title}</span> : null}
      </div>
    </div>
  );
}

// Spreadsheet block on the real kit .cdata / .tbl (table) + .bars (chart), with the kit
// Table/Chart toggle. Column grid is computed once and applied to every row inline (the
// kit sets grid-template-columns per .tr the same way).
function DataBlock({ block }) {
  const d = useMemo(() => normalizeData(block), [block]);
  const [view, setView] = useState('table');
  const cols = d.columns.length || (d.rows[0]?.cells.length || 1);
  const grid = `1.1fr ${Array(Math.max(0, cols - 1)).fill('1fr').join(' ')}`.trim();
  return (
    <div className="cdata" style={{ marginTop: 4 }}>
      <div className="cdata-h">
        <span className="dt">{d.title}</span>
        <div className="toggle">
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Table</button>
          <button className={view === 'chart' ? 'on' : ''} onClick={() => setView('chart')}>Chart</button>
        </div>
      </div>
      {view === 'table' ? (
        <div className="tbl">
          {d.columns.length ? (
            <div className="tr th" style={{ gridTemplateColumns: grid }}>
              {d.columns.map((c, i) => <div key={i} className={i === 0 ? '' : 'num'}>{c}</div>)}
            </div>
          ) : null}
          {d.rows.map((r, ri) => (
            <div key={ri} className="tr" style={{ gridTemplateColumns: grid }}>
              {r.cells.map((cell, ci) => <div key={ci} className={ci === 0 ? '' : 'num'}>{cell}</div>)}
            </div>
          ))}
          {d.totals ? (
            <div className="tr tf" style={{ gridTemplateColumns: grid }}>
              {d.totals.cells.map((cell, ci) => <div key={ci} className={ci === 0 ? '' : 'num pos'}>{cell}</div>)}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="bars">
          {d.rows.map((r, ri) => (
            <div key={ri} className="bar">
              <i style={{ height: `${Math.max(4, r.pct)}%` }} />
              <span>{r.cells[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tappable choices (real kit .chips / .chip-btn). The recommended option is is-primary.
// A tap posts a real user message back into the room (no dead controls).
function ChoiceBlock({ block }) {
  const choices = Array.isArray(block.choices) ? block.choices : [];
  const send = useThreadSend();
  return (
    <div style={{ marginTop: 4 }}>
      {block.prompt ? <div className="gssub" style={{ marginBottom: 6 }}><ChatMessageRenderer content={block.prompt} className="cv6-agent-prose" /></div> : null}
      <div className="chips is-choice">
        {choices.map((c) => {
          const isAlt = c.style === 'alt';
          const text = c.title || c.label || '';
          const isRec = !isAlt;
          const badge = isRec && c.label && c.label !== text ? c.label : null;
          return (
            <button key={c.id} className={`chip-btn ${isRec ? 'is-recommended' : 'is-alt'}`}
              onClick={() => send(c.title || c.label)}>
              <span className="chip-dot" aria-hidden="true">
                {isRec ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </span>
              <span className="chip-main">
                {badge ? <span className="chip-badge">{badge}</span> : null}
                <span className="chip-txt">{text}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Echo of the user's choice (rendered after they tap). Shows what they selected so the
// thread shows the full lifecycle (agent asks, user chooses, choice echoed back).
function ChoiceEchoBlock({ block }) {
  return (
    <div className="cblk is-success" style={{ marginTop: 4 }}>
      <div className="cblk-h">
        <span className="ci"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg></span>
        <span className="ct"><ChatInlineRenderer content={block.title || 'Your choice'} /></span>
      </div>
      {block.detail ? <div className="cblk-b" style={{ fontSize: 12.5 }}><ChatMessageRenderer content={block.detail} className="cv6-agent-prose" /></div> : null}
    </div>
  );
}

// A question the agent needs answered (real kit .cblk is-question). Options become
// tappable reply chips; tapping posts the answer as a real user message.
function QuestionBlock({ block }) {
  const opts = Array.isArray(block.options) ? block.options : [];
  const send = useThreadSend();
  return (
    <div className="cblk is-question" style={{ marginTop: 4 }}>
      <div className="cblk-h">
        <span className="ci"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 .8-1 1.6" /><path d="M12 17h.01" /></svg></span>
        <span className="ct">Quick question</span>
      </div>
      <div className="cblk-b"><ChatMessageRenderer content={block.text} className="cv6-agent-prose" /></div>
      {opts.length ? (
        <div className="chips">
          {opts.map((o) => <button key={o.id} className="chip-btn" onClick={() => send(o.label)}>{o.label}</button>)}
        </div>
      ) : null}
    </div>
  );
}

// Code, shown only when it matters (kit .codechip -> .ccode): a collapsed chip by default
// (file name + lang + diff size), expanding to a titled block with copy + a plain-English
// explain. Non-technical users never see a wall of code. Raw code renders in the kit pre;
// copy puts the real source on the clipboard.
function CodeBlock({ block }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const diff = [block.added != null ? `+${block.added}` : '', block.removed != null ? `−${block.removed}` : ''].filter(Boolean).join(' ');
  const meta = [block.lang, diff].filter(Boolean).join(' · ');
  const copy = () => {
    try { navigator.clipboard?.writeText(block.code || ''); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* clipboard blocked */ }
  };
  const glyph = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#79c0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 6-6 6 6 6M16 6l6 6-6 6" /></svg>;
  if (!open) {
    return (
      <div className="codechip" style={{ marginTop: 4 }} onClick={() => setOpen(true)}>
        <span className="cg">{glyph}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{block.file || 'code'}</div>
          {meta ? <div className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{meta}</div> : null}
        </div>
        <button className="pillbtn" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>Show code</button>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 4 }}>
      <div className="ccode">
        <div className="ccode-h">
          {glyph}
          <span className="fn">{block.file || 'code'}</span>
          {block.lang ? <span className="lang">{block.lang}</span> : null}
          <button className="cbtn" onClick={copy} title="Copy">
            {copied
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>}
          </button>
        </div>
        <pre>{block.code || ''}</pre>
      </div>
      {block.explain ? <div className="bubble" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}><ChatMessageRenderer content={block.explain} className="cv6-agent-prose" /></div> : null}
    </div>
  );
}

// The honest "agent is working" state (kit .thinking): a soft dot pulse + a real label of
// what it's doing right now. No silent gaps, no filler.
function ThinkingBlock({ block }) {
  return (
    <div className="thinking" style={{ marginTop: 4 }}>
      <span className="dot3"><i /><i /><i /></span>
      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{block.label || 'Working…'}</span>
    </div>
  );
}

// Quick replies (kit bubble + .chips): a short prompt and tappable one-tap answers, so a
// reply is one tap, not a typing chore. Each tap posts the label as a real user message.
function RepliesBlock({ block }) {
  const opts = Array.isArray(block.options) ? block.options : [];
  const send = useThreadSend();
  return (
    <div style={{ marginTop: 4 }}>
      {block.prompt ? <div className="bubble"><ChatMessageRenderer content={block.prompt} className="cv6-agent-prose" /></div> : null}
      <div className="chips">
        {opts.map((o, i) => {
          const label = typeof o === 'string' ? o : (o.label || '');
          const primary = typeof o === 'object' && o.primary;
          return <button key={i} className={`chip-btn ${primary ? 'is-primary' : ''}`} onClick={() => send(label)}>{label}</button>;
        })}
      </div>
    </div>
  );
}

// A confirm card (kit .cblk): anything irreversible gets an explicit confirm, the human is
// always in the loop. Confirm/Cancel each post a real message so the agent acts on the answer.
function ConfirmBlock({ block }) {
  const send = useThreadSend();
  return (
    <div style={{ marginTop: 4 }}>
      <div className="cblk" style={{ borderColor: 'var(--accent-weak)' }}>
        {block.text ? <div className="cblk-b" style={{ marginBottom: 11 }}><ChatMessageRenderer content={block.text} className="cv6-agent-prose" /></div> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="chip-btn is-primary" style={{ flex: 1, justifyContent: 'center', height: 40 }} onClick={() => send(block.confirmLabel || 'Confirm and send')}>{block.confirmLabel || 'Confirm & send'}</button>
          <button className="chip-btn" style={{ flex: 'none', height: 40 }} onClick={() => send(block.cancelLabel || 'Cancel')}>{block.cancelLabel || 'Cancel'}</button>
        </div>
      </div>
      {block.note ? <div style={{ fontSize: 11, color: 'var(--faint)', paddingLeft: 2, marginTop: 4 }}><ChatMessageRenderer content={block.note} className="cv6-agent-prose" /></div> : null}
    </div>
  );
}

// A photo gallery / file collection (kit .cgal mosaic): the first images as a tidy mosaic
// with a "+N" overflow tile, a caption, and a tap to open the full image. Never a raw dump.
function GalleryBlock({ block }) {
  const imgs = Array.isArray(block.images) ? block.images : [];
  const shown = imgs.slice(0, 5);
  const overflow = imgs.length - shown.length;
  const openReview = useThreadReview();
  const open = (im) => { if (im?.url) openReview?.({ url: im.url, name: im.label || 'Image' }); };
  return (
    <div style={{ marginTop: 4 }}>
      <div className="cgal">
        {shown.map((im, i) => (
          <div key={i} className={`ph${i === 0 && shown.length >= 3 ? ' span2' : ''}`} onClick={() => open(im)} style={{ cursor: im?.url ? 'pointer' : 'default' }}>
            {im?.url ? <img src={im.url} alt={im.label || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>}
            {i === shown.length - 1 && overflow > 0 ? <span className="more">+{overflow}</span> : null}
          </div>
        ))}
      </div>
      {block.caption ? <div className="gal-cap"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg><span><ChatInlineRenderer content={block.caption} /></span></div> : null}
    </div>
  );
}

// Lightweight context so choice/question taps reach the room's send() without prop drilling.
const SendCtx = React.createContext(() => {});
function useThreadSend() { return React.useContext(SendCtx); }
// Open-in-Review for thread blocks: the hosting surface provides a handler that takes ONE
// file ({ url, name, type? }) and lands the user in the Review tool on that deliverable.
// Null (no provider) = surface has no Review hand-off; blocks keep their fallback behavior.
const ReviewCtx = React.createContext(null);
function useThreadReview() { return React.useContext(ReviewCtx); }

// The thread itself (goal header + steps with their results), shared by the mobile screen
// and the desktop 3-column layout. Wrap in a SendCtx provider so taps post real messages.
// `collapsible` turns the goal header into a toggle: collapsed (the default for the pinned
// in-chat thread) shows only the goal line + progress bar, so the persistent "current goal"
// never re-renders the answer that already lives in the conversation message above it
// (Patrik 2026-06-27: keep the pinned thread, make it collapsible, no duplicate summary).
// The full-screen mobile thread and the demo pass collapsible=false so they stay expanded.
// `header` draws the "Goal: <ask> — X of Y" line + progress bar above the steps. Patrik
// 2026-06-30: in the live conversation the thread IS the conversation — the user's message
// right above already names the goal, so the header is redundant and (as the working turn)
// sometimes lingers at the bottom of the screen. Real chat surfaces pass header={false} for
// just the step thread; the demo keeps it true to show the full element.
export function GoalThreadBody({ goal, blocks, collapsible = false, defaultCollapsed = true, header = true }) {
  const steps = useMemo(() => buildSteps(blocks), [blocks]);
  // The header reads as the real goal: the room goal if set, else the first step the agent
  // actually named (never the old "Working thread" placeholder).
  const firstStepTitle = steps.find((s) => s.title)?.title || '';
  const headTitle = goal?.title || firstStepTitle || 'Current goal';
  // Count from the steps the thread actually renders, so the header + progress bar always
  // match what's on screen (rather than a goal.total that may not line up with the blocks).
  const total = steps.length;
  const done = steps.filter((s) => s.state === 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const [open, setOpen] = useState(!defaultCollapsed);
  const showSteps = !collapsible || open;
  const headStyle = collapsible
    ? { background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }
    : undefined;
  return (
    <div className={`gthread${collapsible ? ' is-collapsible' : ''}`}>
      {header ? React.createElement(
        collapsible ? 'button' : 'div',
        {
          className: 'gthead',
          ...(collapsible ? { type: 'button', onClick: () => setOpen((v) => !v), 'aria-expanded': open, style: headStyle } : {}),
        },
        <span className="gtico">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></svg>
        </span>,
        <span className="gttitle"><span className="gk">Goal:</span> {headTitle}</span>,
        <span className="gtcount">{done} of {total}</span>,
        collapsible ? (
          <span className={`gtchev${open ? ' is-open' : ''}`} style={{ marginLeft: 8, display: 'inline-flex', transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        ) : null,
      ) : null}
      {header ? <div className="gtprog" style={{ margin: showSteps ? '0 0 14px' : '0' }}><i style={{ width: `${pct}%` }} /></div> : null}
      {showSteps ? steps.map((s) => <StepRow key={s.index} step={s} />) : null}
      {showSteps ? <div style={{ height: 8 }} /> : null}
    </div>
  );
}

// A FINISHED goal thread, folded into a compact card that stays in chat history.
// Collapsed by default: one record line (done check + what the agent did + step count).
// Tap the row to expand the full step thread — "show me what happened". The answer itself
// lives in the message bubble / result blocks above; this card is the WORK, not the answer.
// Used wherever a persisted agent turn carries a completed step thread (quick panel + Chat),
// so a finished thread reads as a tidy record instead of a wall of done steps.
export function WorkDoneCard({ goal, blocks }) {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => buildSteps(blocks), [blocks]);
  const total = steps.length;
  if (!total) return null;
  // Label from the thread itself (always correct), not the live room goal — an older
  // finished card must not borrow the current goal's title.
  const label = 'What I did';
  return (
    <div className="wdcard" style={{ marginTop: 8 }}>
      <button type="button" className="wdcard-h" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="wdcard-ico"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg></span>
        <span className="wdcard-t">{label}</span>
        <span className="wdcard-n">{total} step{total === 1 ? '' : 's'}</span>
        <span className={`wdcard-chev${open ? ' is-open' : ''}`}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></span>
      </button>
      {open ? (
        <div className="wdcard-body">
          <GoalThreadBody goal={goal || { title: 'Completed steps' }} blocks={blocks} header={false} />
        </div>
      ) : null}
    </div>
  );
}

// Decide how one agent message's blocks render. Patrik 2026-06-29: the thread IS the
// conversation — a finished agent turn shows its step thread INLINE, right under the message,
// as the durable record of what the agent did (the steps it checked off + the results it
// attached), never a collapsed "What I did" card you have to open. So:
//   - any step blocks (working OR done) -> the step thread inline (GoalThreadBody, expanded)
//   - no steps (lone answer blocks: summary/data/gallery/...) -> render each inline
// (WorkDoneCard stays exported for any caller that still wants the folded record.)
export function AgentBlocks({ goal, blocks }) {
  const steps = useMemo(() => buildSteps(blocks), [blocks]);
  const hasSteps = steps.length > 0;
  if (hasSteps) return <GoalThreadBody goal={goal} blocks={blocks} header={false} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(Array.isArray(blocks) ? blocks : []).map((b, i) => <Result key={i} block={b} />)}
    </div>
  );
}

// ── The Plan: the editable forward plan for a room (goal-thread-plan mission) ──
// Three item types read APART (VISION pillar 1):
//   • YOURS  (source:user)             — a step you added; checkbox tracks done, → hands it to the agent
//   • NEXT   (source:agent, proposed)  — an agent SUGGESTION, never committed fact: Keep / edit / dismiss
//   • DONE   (done:true)               — a finished plan item, checked + struck through
// Two gestures never collide (pillar 2): the checkbox marks done (tracking), the → button is the
// explicit hand-off ("agent, go do this one now") and posts a real message via SendCtx.
// Collapsed = the glance (goal + progress); expanded = this list + an "add a step" input.

// Pencil / check / x / hand-off glyphs, sized to sit inline with a row.
const Gly = {
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>,
  x: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  pencil: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  handoff: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13" /><path d="m12 5 7 7-7 7" /></svg>,
};

// A round checkbox that marks a plan step done (tracking only — NOT the hand-off).
function PlanCheck({ done, onToggle }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={done} title={done ? 'Mark not done' : 'Mark done'}
      style={{
        flex: 'none', width: 20, height: 20, borderRadius: 6, cursor: 'pointer', marginTop: 1,
        border: done ? '1px solid var(--accent)' : '1.5px solid var(--hair)',
        background: done ? 'var(--accent)' : 'transparent', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      }}>
      {done ? Gly.check : null}
    </button>
  );
}

// The "hand it to the agent" button — the explicit, deliberate gesture (a stray tap on the
// checkbox can never kick off work). Posts a real instruction message into the room. On a plan
// row this is the PRIMARY action (filled accent): handing a step to the agent is the main move on
// a plan you steer, so it must outweigh the track-only checkbox (Steffen gate 2026-06-27). The
// proposal card passes variant="ghost" because there "Keep" is the primary and Do now secondary.
function HandoffBtn({ text, variant = 'primary' }) {
  const send = useThreadSend();
  const primary = variant === 'primary';
  return (
    <button type="button" title="Hand this to the agent now"
      onClick={() => send(`Go ahead and do this next: ${text}`)}
      style={{
        flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 12px',
        borderRadius: 8, border: primary ? 'none' : '1px solid var(--accent-weak, rgba(245,158,11,.4))',
        background: primary ? 'var(--accent)' : 'transparent',
        color: primary ? '#fff' : 'var(--accent)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'var(--font-sans)', boxShadow: primary ? '0 2px 8px rgba(0,0,0,.22)' : 'none',
      }}>
      {Gly.handoff} Do now
    </button>
  );
}

// One committed step. Each row sits in a ZONE (Steffen gate 2026-06-27): an OPEN step (YOURS, still
// to do) gets a warm cream surface so it reads as the live action zone and pulls the eye; a DONE step
// gets a faint cool surface so struck text stays readable while it recedes as "completed fact". The
// hand-off (filled accent, primary) outweighs the quiet track-only checkbox.
function PlanRow({ step, actions }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.text);
  const commit = () => { const t = draft.trim(); if (t && t !== step.text) actions.editStep(step.id, t); setEditing(false); };
  // DONE recedes (faint cool, no left bar); an OPEN step is the live action zone — a warm cream
  // surface with a warm left accent bar so it reads as "yours to act on" at a glance, distinct from
  // the recessed done rows and the amber suggestion card (Steffen gate 2026-06-27, strengthened).
  const zone = step.done
    ? { background: 'rgba(150,170,200,.05)', border: '1px solid rgba(150,170,200,.06)', borderLeft: '1px solid rgba(150,170,200,.06)' }
    : { background: 'rgba(236,222,194,.09)', border: '1px solid rgba(236,222,194,.12)', borderLeft: '3px solid rgba(236,210,160,.55)' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 9, marginTop: 7, ...zone }}>
      <PlanCheck done={step.done} onToggle={() => actions.toggleStep(step.id)} />
      {editing ? (
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          style={{ flex: 1, height: 28, borderRadius: 7, border: '1px solid var(--accent-weak, rgba(245,158,11,.4))', background: 'var(--surface-2)', padding: '0 10px', fontSize: 13, color: 'var(--fg)', fontFamily: 'var(--font-sans)', outline: 'none' }} />
      ) : (
        <button type="button" onClick={() => { setDraft(step.text); setEditing(true); }} title="Edit step"
          style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'text', fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.45, color: step.done ? 'var(--muted)' : 'var(--fg)', textDecoration: step.done ? 'line-through' : 'none' }}>
          {step.text}
        </button>
      )}
      {!editing && !step.done ? <HandoffBtn text={step.text} /> : null}
    </div>
  );
}

// An agent SUGGESTION for the next step — never rendered as committed fact (VISION pillar 3).
// Distinct dashed/amber card with a "Suggested" tag and the accept / edit / dismiss controls.
function ProposalRow({ step, actions }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.text);
  const commit = () => { const t = draft.trim(); if (t) actions.editStep(step.id, t); setEditing(false); };
  return (
    <div style={{ position: 'relative', marginTop: 9, padding: '12px 12px 11px', borderRadius: 10, border: '1px solid rgba(245,158,11,.6)', borderLeft: '3px solid rgba(245,158,11,.85)', background: 'rgba(245,158,11,.12)', boxShadow: '0 1px 10px rgba(245,158,11,.10)' }}>
      <span style={{ position: 'absolute', top: 10, right: 10, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--accent)', background: 'rgba(245,158,11,.14)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" /></svg>
        Agent suggests
      </span>
      {editing ? (
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          style={{ width: '100%', height: 30, borderRadius: 7, border: '1px solid var(--accent-weak, rgba(245,158,11,.4))', background: 'var(--surface-2)', padding: '0 10px', fontSize: 13, color: 'var(--fg)', fontFamily: 'var(--font-sans)', outline: 'none', margin: '4px 0 8px' }} />
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--fg)', margin: '2px 92px 10px 0' }}>{step.text}</div>
      )}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => actions.acceptStep(step.id)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 11px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 2px 8px rgba(0,0,0,.22)' }}>
          {Gly.check} Keep
        </button>
        <HandoffBtn text={step.text} variant="ghost" />
        <button type="button" onClick={() => { setDraft(step.text); setEditing(true); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 7, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--muted)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          {Gly.pencil} Edit
        </button>
        <button type="button" onClick={() => actions.dismissStep(step.id)} title="Dismiss this suggestion"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 7, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--faint)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          {Gly.x} Dismiss
        </button>
      </div>
    </div>
  );
}

// The Plan panel, pinned at the foot of the thread. Collapsible: collapsed shows the glance
// (goal + progress), expanded shows the editable list + the add-a-step input. Renders nothing
// until there's something to steer (no items + no goal title => stays out of the way).
export function PlanPanel({ goal, plan, actions, defaultCollapsed = false }) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const [draft, setDraft] = useState('');
  const items = Array.isArray(plan) ? plan : [];
  const proposals = items.filter((s) => s.source === 'agent' && s.proposed && !s.done);
  const committed = items.filter((s) => !(s.source === 'agent' && s.proposed));
  const open_ = committed.filter((s) => !s.done);
  const done_ = committed.filter((s) => s.done);
  const total = committed.length;
  const doneN = done_.length;
  const pct = total ? Math.round((doneN / total) * 100) : 0;
  const title = goal?.title || 'Plan';
  const add = () => { const t = draft.trim(); if (!t) return; actions.addStep(t); setDraft(''); };
  if (!items.length && !goal?.title) return null;
  const nextCount = open_.length + proposals.length;
  return (
    <div className="gthread is-collapsible" style={{ marginTop: 10 }}>
      <button type="button" className="gthead" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        style={{ background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
        <span className="gtico">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
        </span>
        <span className="gttitle"><span className="gk">Plan:</span> {title}</span>
        <span className="gtcount" style={nextCount ? { color: 'var(--accent)', fontWeight: 700 } : undefined}>{nextCount ? `${nextCount} next` : `${doneN} of ${total}`}</span>
        <span className={`gtchev${open ? ' is-open' : ''}`} style={{ marginLeft: 8, display: 'inline-flex', transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>
      <div className="gtprog" style={{ margin: open ? '0 0 10px' : '0' }}><i style={{ width: `${pct}%` }} /></div>
      {open ? (
        <div>
          {open_.map((s) => <PlanRow key={s.id} step={s} actions={actions} />)}
          {proposals.map((s) => <ProposalRow key={s.id} step={s} actions={actions} />)}
          {done_.length ? (
            <div style={{ marginTop: 8 }}>
              {done_.map((s) => <PlanRow key={s.id} step={s} actions={actions} />)}
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--hair)', paddingTop: 11 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
              placeholder="Add the next step…"
              style={{ flex: 1, height: 34, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '0 12px', fontSize: 13, color: 'var(--fg)', fontFamily: 'var(--font-sans)', outline: 'none' }} />
            <button type="button" onClick={add} disabled={!draft.trim()}
              style={{ flex: 'none', height: 34, padding: '0 14px', borderRadius: 9, border: 'none', background: draft.trim() ? 'var(--accent)' : 'var(--surface-2)', color: draft.trim() ? '#fff' : 'var(--faint)', fontSize: 12.5, fontWeight: 600, cursor: draft.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-sans)' }}>
              Add
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { SendCtx, ReviewCtx };

export default function ChatGoalThread({ room, goal, blocks, onBack, onOpenNav, onSend }) {
  const [draft, setDraft] = useState('');
  const submit = () => { const t = draft.trim(); if (!t) return; onSend?.(t); setDraft(''); };
  return (
    <SendCtx.Provider value={onSend || (() => {})}>
      <div data-cv6 data-theme="dark" className="cv6-screen" style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--ground, #05080b)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="mhdr">
          <div className="mback" onClick={onBack}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></div>
          <div style={{ position: 'relative', flex: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{room.initials || '·'}</div>
            <span className={`sdot is-${room.status || 'ready'}`} style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, border: '2px solid var(--ground)' }} />
          </div>
          <div className="mhtitle">
            <div className="mttl">{room.name}</div>
            <div className="msub">{room.statusText || 'thread'}{goal?.total ? <> · step {goal.step} of {goal.total}</> : null}</div>
          </div>
          <div className="mhactions">
            <div className="ib" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={onOpenNav}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg></div>
          </div>
        </div>
        <div className="scrbody" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px 0' }}>
          {/* Cap the thread to a readable column so on iPad it stays phone-width and
              centered, instead of stretching the tables + charts edge to edge. */}
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <GoalThreadBody goal={goal} blocks={blocks} header={false} />
          </div>
        </div>
        <div className="mcomposer">
          <button onClick={submit} style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: 'var(--ring-accent)' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5c.8-1.2 4.2-1.2 5 0" /></svg>
          </button>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder={`Nudge ${room.name}, or jump in…`}
            style={{ flex: 1, height: 42, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '0 14px', fontSize: 14, color: 'var(--fg)', fontFamily: 'var(--font-sans)', outline: 'none' }} />
          <button onClick={submit} style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
          </button>
        </div>
      </div>
    </SendCtx.Provider>
  );
}
