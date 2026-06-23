// ChatLifecycle -- the plain conversation over its whole life (design item 1).
// The "jumbled pile" fix: a room's real messages are grouped by day. The latest
// day stays open inline; older days collapse into one-line cards you tap to expand,
// so hundreds of past turns stop being a wall of text. Long single messages clamp
// with a "show more". A jump-to-latest pill appears when you scroll up.
//
// This is the plain-conversation path (no live structured goal). When the agent is
// emitting a live Goal Thread, ChatGoalThread renders that instead. Honest with real
// data: we fold by DAY (which we have), not by past "goals" (never stored).
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';

function dayKey(ts) {
  const d = ts ? new Date(ts) : null;
  if (!d || Number.isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function dayLabel(ts) {
  const d = ts ? new Date(ts) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Earlier';
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Group messages (oldest -> newest) into day buckets, preserving order.
function groupByDay(messages) {
  const groups = [];
  let cur = null;
  for (const m of messages) {
    const k = dayKey(m.ts);
    if (!cur || cur.key !== k) { cur = { key: k, label: dayLabel(m.ts), items: [] }; groups.push(cur); }
    cur.items.push(m);
  }
  return groups;
}

function Avatar({ m }) {
  const tint = m.agentTint === 'accent' ? 'var(--accent)' : `var(--${m.agentTint || 'muted'}, var(--muted))`;
  return (
    <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.isUser ? 'var(--accent-weak)' : 'var(--surface-2)', color: m.isUser ? 'var(--accent)' : tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>
      {m.agentInitials}
    </div>
  );
}

// One message. Long bodies clamp until expanded (design .longmsg containment).
function Message({ m }) {
  const ref = useRef(null);
  const [clamped, setClamped] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el && !open) setClamped(el.scrollHeight > 168 + 4);
  }, [m.text, open]);
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <Avatar m={m} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{m.agentName}</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{m.time}</span>
        </div>
        <div ref={ref} className={`longmsg${clamped && !open ? ' is-clamped' : ''}`} style={open ? { maxHeight: 'none' } : undefined}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</div>
        </div>
        {clamped && (
          <button className="longmsg-more" onClick={() => setOpen((v) => !v)}>{open ? 'Show less' : 'Show more'}</button>
        )}
      </div>
    </div>
  );
}

// An older day, folded into a one-line card you tap to open.
function DayCard({ group }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`goalcard${open ? ' is-open' : ''}`} style={{ marginBottom: 10 }}>
      <div className="gc-head" onClick={() => setOpen((v) => !v)}>
        <span className="gc-title">{group.label}</span>
        <span className="gc-meta">{group.items.length} message{group.items.length === 1 ? '' : 's'}</span>
        <svg className="gc-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </div>
      <div className="gc-body">
        {group.items.map((m, i) => <Message key={i} m={m} />)}
      </div>
    </div>
  );
}

export default function ChatLifecycle({ room, messages, status, onBack, onOpenNav, onSend }) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const [showJump, setShowJump] = useState(false);

  const groups = useMemo(() => groupByDay(messages || []), [messages]);
  const older = groups.slice(0, -1);
  const latest = groups[groups.length - 1] || null;

  const submit = () => { const t = draft.trim(); if (!t) return; onSend?.(t); setDraft(''); };
  const jumpToLatest = useCallback(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), []);

  // The jump-to-latest pill shows only when scrolled up away from the tail.
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJump(fromBottom > 240);
  }, []);

  // Land at the latest message on open (the tail is home).
  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [room?.name]);

  const empty = status === 'empty' || !messages?.length;

  return (
    <div data-cv6 data-theme="dark" className="cv6-screen" style={{ position: 'relative', width: '100%', height: '100%', background: '#05080b', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="mhdr">
        <div className="mback" onClick={onBack}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></div>
        <div style={{ position: 'relative', flex: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{room.initials || '·'}</div>
          <span className={`sdot is-${room.status || 'ready'}`} style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, border: '2px solid var(--ground)' }} />
        </div>
        <div className="mhtitle">
          <div className="mttl">{room.name}</div>
          <div className="msub">{room.statusText || 'conversation'}</div>
        </div>
        <div className="mhactions">
          <div className="ib" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={onOpenNav}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg></div>
        </div>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="scrbody" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px 0' }}>
        {empty ? (
          <div className="empty" style={{ marginTop: 40 }}>
            <div className="e-t">No messages with {room.name} yet</div>
            <div className="e-s">Start the conversation below.</div>
          </div>
        ) : (
          <>
            {older.map((g, i) => (
              <React.Fragment key={g.key + i}>
                <div className="daydiv"><span>{g.label.toUpperCase()}</span></div>
                <DayCard group={g} />
              </React.Fragment>
            ))}
            {latest && (
              <>
                <div className="daydiv"><span>{latest.label.toUpperCase()}</span></div>
                {latest.items.map((m, i) => <Message key={i} m={m} />)}
              </>
            )}
          </>
        )}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {showJump && (
        <button className="jumplive" onClick={jumpToLatest}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
          Jump to latest
        </button>
      )}

      <div className="mcomposer">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder={`Message ${room.name}…`}
          style={{ flex: 1, height: 42, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '0 14px', fontSize: 14, color: 'var(--fg)', fontFamily: 'var(--font-sans)', outline: 'none' }} />
        <button onClick={submit} style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
        </button>
      </div>
    </div>
  );
}
