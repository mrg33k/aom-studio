// cv6next — Support, desktop. Built from the CV6 design system's
// wired/tools/support.html (design-system-current; Patrik pointed at
// "Design System (7)" 2026-07-01 — identical file): inbox rail (Open/Waiting)
// + email-review pane with AI summary, original email, suggested actions, and
// the reply composer. Every control is wired to a real mechanism:
//   Summary card      ← wish message bullets (+ /api/support/suggest)
//   Suggested chips   ← wish reply_options / staged Gmail draft
//   Send              ← staged draft untouched → send-staged.js (fires the draft);
//                       edited/custom text     → reply.js (in-thread, as you)
//   Resolve           ← PATCH /api/support/wishes (status: resolved)
//   Add to Tracker    ← POST /api/dashboard/trackers (Support follow-ups)
//   Assign to agent   ← onAssignEmail (existing flow)
// Email-scan rows (no wish behind them) keep the reading pane + Assign only —
// their reply plumbing is the wish pipeline; no dead Send button on them.

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSupportInbox, latencyLabel } from './data/useSupportInbox.js';
import SupportThread from './SupportThread.jsx';
import { authFetch } from '../lib/authFetch';

// Strips angle-bracket URL syntax (<https://...>) that agent-produced markdown emits.
// Shared helper: used here for the desktop React render and exported for the mobile
// template data path in CornerCV6.jsx (both surfaces, one truth).
export function normalizeLinks(str) {
  return String(str || '').replace(/<(https?:\/\/[^>\s]+)>/g, '$1');
}

const SUPPORT_TRACKER_NAME = 'Support follow-ups';

function Star({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" /></svg>;
}

function InboxRow({ it, open, onClick }) {
  return (
    <div onClick={open ? undefined : onClick} className={open ? 'ask is-open' : 'ask'} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14, borderRadius: 10, background: open ? 'var(--accent-weak)' : 'transparent', cursor: open ? 'default' : 'pointer', marginBottom: 2 }}>
      <div className={`ava is-${it.avatarTint || 'violet'}`} style={{ width: 38, height: 38, fontSize: 12, flex: 'none' }}>{it.initials || '·'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.subject}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.snippet}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flex: 'none' }}>
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>{it.time}</span>
        {it.hasStaged ? <span className="pill" style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'var(--success-weak)', color: 'var(--success)', fontWeight: 600 }}>Draft ready</span>
          : it.kind === 'email' ? <span className="pill is-email" style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8 }}>Email</span> : null}
      </div>
    </div>
  );
}

// Design-gate R3 (Steffen, 2026-07-01): the recommended reply must read as THE
// action, not one-of-N. Primary is taller, heavier, filled; peers drop to
// quiet outline chips with muted text so the eye lands on the reply first.
const chipStyle = (primary) => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: primary ? 36 : 30,
  padding: primary ? '0 16px' : '0 12px',
  borderRadius: primary ? 18 : 15,
  border: primary ? 'none' : '1px solid var(--hair)',
  background: primary ? 'var(--accent)' : 'transparent',
  color: primary ? '#fff' : 'var(--muted)',
  fontSize: primary ? 13 : 12,
  fontWeight: primary ? 600 : 500,
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
});

export default function SupportDesktop({ onNav, onOpenNav, onAssignEmail }) {
  const { state, data, reload } = useSupportInbox('aom');
  const needsYou = data?.needsYou || [];
  const watching = data?.watching || [];
  const [tab, setTab] = useState('open'); // open | waiting
  const list = tab === 'open' ? needsYou : watching;
  const [picked, setPicked] = useState(null);
  const selected = useMemo(() => picked || list[0] || null, [picked, list]);
  const isWish = selected?.kind === 'wish';

  // Board-level reply speed: median ask → first-reply gap over the last 7 days.
  const medianLatency = useMemo(() => {
    const week = 7 * 86400000;
    const vals = [...needsYou, ...watching]
      .filter((it) => it.latencySeconds != null && it.createdAt && Date.now() - new Date(it.createdAt).getTime() < week)
      .map((it) => it.latencySeconds)
      .sort((a, b) => a - b);
    return vals.length ? vals[Math.floor(vals.length / 2)] : null;
  }, [needsYou, watching]);

  // Reply-pane intelligence: staged draft body + reply options via /api/support/suggest.
  // The fetch is BOUNDED (20s abort): "thinking…" always resolves to real bullets or an
  // honest failed line — a hung endpoint can never leave the card spinning forever.
  const [suggest, setSuggest] = useState(null); // { summary, recommendation, options, staged, original }
  const [suggestState, setSuggestState] = useState('idle'); // idle | loading | ready | error
  const suggestFor = useRef(null);
  useEffect(() => {
    setSuggest(null);
    if (!selected || selected.kind !== 'wish') { setSuggestState('idle'); return; }
    let dead = false;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    suggestFor.current = selected.id;
    setSuggestState('loading');
    authFetch(`/api/support/suggest?wish_id=${encodeURIComponent(selected.wishId)}`, { credentials: 'include', signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (dead || suggestFor.current !== selected.id) return;
        if (d.ok) { setSuggest(d); setSuggestState('ready'); } else setSuggestState('error');
      })
      .catch(() => { if (!dead && suggestFor.current === selected.id) setSuggestState('error'); })
      .finally(() => clearTimeout(timer));
    return () => { dead = true; ctl.abort(); clearTimeout(timer); };
  }, [selected?.id, selected?.kind, selected?.wishId]);

  // Composer. Draft-reply chips fill it; the send path depends on whether the
  // text is still exactly the staged draft (fire the draft) or edited (reply.js).
  const [composer, setComposer] = useState('');
  const [sendState, setSendState] = useState('idle'); // idle | sending | sent | error
  const [sendError, setSendError] = useState('');
  useEffect(() => { setComposer(''); setSendState('idle'); setSendError(''); }, [selected?.id]);

  const stagedBody = suggest?.staged?.body || null;
  const options = suggest?.options || selected?.replyOptions || [];
  const summary = (suggest?.summary?.length ? suggest.summary : selected?.summary) || [];
  const recommendation = (suggest?.recommendation?.length ? suggest.recommendation : selected?.recommendation) || [];
  // The worker's actual read wins over the ingest paraphrase (M27 Stage 3).
  const agentRead = suggest?.agent_read || selected?.agentRead || null;

  // Scheduled auto-send state (timer policy): countdown + a Hold-it cancel.
  const [scheduleState, setScheduleState] = useState('idle'); // idle | clearing | cleared
  useEffect(() => { setScheduleState('idle'); }, [selected?.id]);
  const autoSendAt = scheduleState === 'cleared' ? null : (suggest?.auto_send_at || selected?.autoSendAt || null);
  const autoSendLabel = useMemo(() => {
    if (!autoSendAt) return '';
    const mins = Math.max(1, Math.round((new Date(autoSendAt) - Date.now()) / 60000));
    return mins < 90 ? `in ${mins}m` : `in ${Math.round(mins / 60)}h`;
  }, [autoSendAt]);
  const cancelSchedule = useCallback(async () => {
    if (!isWish || scheduleState === 'clearing') return;
    setScheduleState('clearing');
    try {
      await authFetch('/api/support/send-staged', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ action: 'clear_schedule', wish_id: selected.wishId }),
      });
      setScheduleState('cleared');
    } catch { setScheduleState('idle'); }
  }, [isWish, scheduleState, selected]);
  const readRows = agentRead ? [
    ['Who', agentRead.who], ['Ask', agentRead.ask], ['Where it stands', agentRead.state],
    ['What we did', agentRead.did], ['Next', agentRead.next],
  ].filter(([, v]) => v && String(v).trim()) : [];

  const doSend = useCallback(async () => {
    const text = composer.trim();
    if (!text || !isWish || sendState === 'sending') return;
    setSendState('sending'); setSendError('');
    try {
      let r;
      if (stagedBody && text === stagedBody.trim() && suggest?.staged?.draft_id) {
        // Untouched staged draft → fire the exact Gmail draft the agent staged.
        r = await authFetch('/api/support/send-staged', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ action: 'send', wish_id: selected.wishId, draft_id: suggest.staged.draft_id, connection_id: suggest.staged.connection_id }),
        });
      } else {
        r = await authFetch('/api/support/reply', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ wish_id: selected.wishId, text }),
        });
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) throw new Error(d.error || `send failed (${r.status})`);
      setSendState('sent');
      setComposer('');
      setTimeout(() => { reload(); }, 800);
    } catch (e) {
      setSendState('error');
      setSendError(String(e.message || e).slice(0, 120));
    }
  }, [composer, isWish, sendState, stagedBody, suggest, selected, reload]);

  const doResolve = useCallback(async () => {
    if (!isWish) return;
    try {
      await authFetch(`/api/support/wishes?id=${encodeURIComponent(selected.wishId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ status: 'resolved' }),
      });
      setPicked(null);
      reload();
    } catch { /* row keeps rendering; next reload shows truth */ }
  }, [isWish, selected, reload]);

  const [trackerState, setTrackerState] = useState('idle'); // idle | adding | added
  const addToTracker = useCallback(async () => {
    if (!selected || trackerState === 'adding') return;
    setTrackerState('adding');
    try {
      const lr = await authFetch('/api/dashboard/trackers?world=aom', { credentials: 'include' });
      const ld = await lr.json();
      let trk = (ld.trackers || []).find((t) => t.name === SUPPORT_TRACKER_NAME);
      if (!trk) {
        const cr = await authFetch('/api/dashboard/trackers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ action: 'create', world: 'aom', name: SUPPORT_TRACKER_NAME, scope: 'Support', template: 'mission', columns: ['Item', 'Status'] }),
        });
        trk = (await cr.json()).tracker;
      }
      if (trk) {
        await authFetch('/api/dashboard/trackers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ action: 'add-row', world: 'aom', id: trk.id, row: { Item: `${selected.sender}: ${selected.subject}`, Status: 'Open' } }),
        });
      }
      setTrackerState('added');
      setTimeout(() => setTrackerState('idle'), 2500);
    } catch { setTrackerState('idle'); }
  }, [selected, trackerState]);

  return (
    <div data-cv6 data-theme="dark" className="cv6-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* inbox rail */}
        <div style={{ width: 392, flex: 'none', borderRight: '1px solid var(--divider)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>Inbox</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                {needsYou.length} open · {watching.length} waiting on you
                {medianLatency != null && <span> · replies in ~{latencyLabel(medianLatency)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {[['open', 'Open'], ['waiting', 'Waiting']].map(([k, label]) => (
                <button key={k} onClick={tab !== k ? () => { setTab(k); setPicked(null); } : undefined} aria-current={tab === k ? 'true' : undefined} style={{ height: 32, padding: '0 13px', borderRadius: 16, border: tab === k ? 'none' : '1px solid var(--hair)', background: tab === k ? 'var(--accent-weak)' : 'transparent', color: tab === k ? 'var(--accent)' : 'var(--muted)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: tab === k ? 'default' : 'pointer' }}>{label}</button>
              ))}
            </div>
          </div>
          <div className="eyebrow" style={{ margin: '0 24px 8px', fontSize: 11, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--faint)', fontWeight: 600 }}>{tab === 'open' ? 'Open asks' : 'Waiting'}</div>
          <div style={{ padding: '0 16px 16px' }}>
            {state === 'loading' ? <div style={{ color: 'var(--muted)', fontSize: 13, padding: 14 }}>Gathering your inbox…</div>
              : list.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 13.5, padding: 14 }}>{tab === 'open' ? "You're all caught up. New asks the agent flags as real land here." : 'Nothing waiting right now.'}</div>
                : list.map((it) => <InboxRow key={it.id} it={it} open={selected?.id === it.id} onClick={() => setPicked(it)} />)}
          </div>
        </div>

        {/* email review */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }} data-state="ready">
          {selected ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 26px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.015em', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {selected.sender}{selected.address ? ` · ${selected.address}` : ''} · {selected.time}
                    {selected.latencySeconds != null && (
                      <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 8, background: 'var(--success-weak)', color: 'var(--success)', fontSize: 11, fontWeight: 600 }}>
                        Replied in {latencyLabel(selected.latencySeconds)}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => onAssignEmail?.(selected.id, selected)} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--fg)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Assign</button>
                {isWish && (
                  <button onClick={doResolve} style={{ height: 36, padding: '0 15px', borderRadius: 10, border: 'none', background: 'var(--success-weak)', color: 'var(--success)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>Resolve
                  </button>
                )}
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '22px 0' }}>
                <div style={{ width: 700, maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* AI summary — real bullets, or one honest status line (pending is
                      bounded by the fetch timeout; failed says failed; a wish the agent
                      gave no summary — e.g. spam-gated — says so). Never a stuck spinner. */}
                  {(summary.length > 0 || recommendation.length > 0 || (isWish && suggestState !== 'idle')) && (
                    <div style={{ border: '1px solid var(--accent-weak)', background: 'linear-gradient(180deg,var(--accent-weak),transparent)', borderRadius: 16, padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <Star />
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                          {readRows.length ? 'Your agent read this' : 'Summary by your agent'}
                        </span>
                        {suggestState === 'loading' && <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted)' }}>thinking…</span>}
                      </div>
                      {/* the worker's structured read — who / ask / state / did / next */}
                      {readRows.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: (summary.length || recommendation.length) ? 12 : 0 }}>
                          {readRows.map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                              <span style={{ flex: 'none', width: 108, fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 2.5 }}>{label}</span>
                              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)' }}>{normalizeLinks(String(value))}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {!readRows.length && summary.map((pt, i) => (
                          <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flex: 'none', marginTop: 7 }} />
                            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)' }}>{normalizeLinks(pt)}</div>
                          </div>
                        ))}
                        {recommendation.map((pt, i) => (
                          <div key={`r${i}`} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)', flex: 'none', marginTop: 7 }} />
                            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)' }}>{normalizeLinks(pt)}</div>
                          </div>
                        ))}
                        {!readRows.length && summary.length === 0 && recommendation.length === 0 && suggestState === 'loading' && (
                          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>Summarizing… the full email is below.</div>
                        )}
                        {!readRows.length && summary.length === 0 && recommendation.length === 0 && suggestState === 'error' && (
                          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>The summary didn't come back this time. The full email is below.</div>
                        )}
                        {!readRows.length && summary.length === 0 && recommendation.length === 0 && suggestState === 'ready' && (
                          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>No summary for this one. The full email is below.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* the conversation — real Gmail chain when the wish has a thread,
                      single-message fallback otherwise (SupportThread handles both) */}
                  <SupportThread
                    wishId={isWish ? selected.wishId : null}
                    refreshToken={`${selected.id}${sendState === 'sent' ? '-sent' : ''}`}
                    fallback={{
                      sender: selected.sender,
                      address: selected.address,
                      initials: selected.initials,
                      avatarTint: selected.avatarTint,
                      time: selected.time,
                      body: suggest?.original || selected.body || 'No message body.',
                    }}
                  />
                </div>
              </div>

              {/* suggested actions + composer — wishes only (email-scan rows reply via the wish pipeline) */}
              {isWish ? (
                <div style={{ borderTop: '1px solid var(--divider)', padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* M27 solve-then-stage: a held draft is LOUD — what the agent did, and
                      that the reply waits on you (with the countdown when scheduled). */}
                  {suggest?.staged?.draft_id && selected.status !== 'resolved' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'var(--accent-weak)', border: '1px solid var(--accent-weak)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                          {autoSendAt && new Date(autoSendAt) > Date.now()
                            ? `Draft ready — sends itself ${autoSendLabel} unless you step in`
                            : 'Draft ready — waiting on you'}
                        </div>
                        {suggest?.worker_note?.body && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Agent: {normalizeLinks(suggest.worker_note.body)}
                          </div>
                        )}
                      </div>
                      {autoSendAt && new Date(autoSendAt) > Date.now() && (
                        <button onClick={cancelSchedule} style={{ height: 30, padding: '0 12px', borderRadius: 15, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--muted)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', flex: 'none' }}>
                          {scheduleState === 'clearing' ? 'Stopping…' : 'Hold it'}
                        </button>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <Star />
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--accent)', marginRight: 2 }}>Suggested</span>
                    {options.length === 0 && suggestState === 'loading' && <span style={{ fontSize: 12, color: 'var(--muted)' }}>drafting…</span>}
                    {options.length === 0 && (suggestState === 'error' || suggestState === 'ready') && <span style={{ fontSize: 12, color: 'var(--muted)' }}>No suggestions came back — write your reply below.</span>}
                    {options.filter(o => o.text).map((o, i) => (
                      // aria-pressed marks the suggestion currently loaded into the composer —
                      // a real, readable state (this reply is staged), not a fire-and-forget click.
                      <button key={i} aria-pressed={composer === o.text ? 'true' : 'false'} onClick={() => setComposer(o.text)} style={chipStyle(i === 0)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                        {o.label || 'Draft reply'}
                      </button>
                    ))}
                    <button onClick={addToTracker} style={chipStyle(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
                      {trackerState === 'added' ? 'Added ✓' : trackerState === 'adding' ? 'Adding…' : 'Add to Tracker'}
                    </button>
                  </div>
                  {sendState === 'sent' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, borderRadius: 11, background: 'var(--success-weak)', color: 'var(--success)', padding: '0 14px', fontSize: 13.5, fontWeight: 600 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
                      Sent as you, on the same thread.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                      <textarea
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        placeholder="Write a reply, or tap a suggestion above…"
                        rows={composer ? Math.min(8, composer.split('\n').length + 1) : 1}
                        style={{ flex: 1, minHeight: 42, borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '11px 14px', fontSize: 14, lineHeight: 1.5, color: 'var(--fg)', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none' }}
                      />
                      <button onClick={doSend} disabled={!composer.trim() || sendState === 'sending'} title={stagedBody && composer.trim() === stagedBody.trim() ? 'Fires the staged draft as-is' : 'Sends in-thread, as you'} style={{ width: 42, height: 42, borderRadius: 11, border: 'none', background: composer.trim() ? 'var(--accent)' : 'var(--surface-2)', color: composer.trim() ? '#fff' : 'var(--faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: composer.trim() ? 'pointer' : 'default' }}>
                        {sendState === 'sending'
                          ? <span style={{ fontSize: 11 }}>…</span>
                          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>}
                      </button>
                    </div>
                  )}
                  {sendState === 'error' && <div style={{ fontSize: 12.5, color: 'var(--warn)' }}>Send failed: {sendError}. Nothing went out — try again.</div>}
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--divider)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)' }}>This landed straight from your mailbox scan. Assign it to your agent and it becomes an ask you can reply to from here.</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)', fontSize: 14, padding: 24 }}>Pick an ask on the left to read it.</div>
          )}
        </div>
      </div>
    </div>
  );
}
