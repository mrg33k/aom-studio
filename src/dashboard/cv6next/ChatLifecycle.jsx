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
import { GoalThreadBody, SendCtx } from './ChatGoalThread.jsx';

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
    <div data-userturn={m.isUser ? '' : undefined} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
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

// --- files in a room (design item 3) -----------------------------------------
// An agent's files show as a GALLERY of cards in the thread, not a text list.
// Tapping a card opens a quick preview with a Review option.
function fileKind(name = '', mime = '') {
  const n = String(name).toLowerCase(); const m = String(mime).toLowerCase();
  if (/^https?:\/\//.test(n) || /\.(url|link)$/.test(n)) return 'link';
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|heic|bmp)$/.test(n)) return 'image';
  if (m.startsWith('video/') || /\.(mp4|mov|webm|m4v|avi)$/.test(n)) return 'video';
  if (m.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/.test(n)) return 'audio';
  return 'doc';
}
function fmtSize(n) {
  if (!n) return ''; if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
const KIND_TINT = { image: 'var(--violet-400)', video: 'var(--violet-400)', audio: 'var(--accent)', link: 'var(--accent)', doc: 'var(--muted)' };
function FileGlyph({ kind, size = 20 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: KIND_TINT[kind] || 'var(--muted)', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (kind === 'image') return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>;
  if (kind === 'video') return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3Z" /></svg>;
  if (kind === 'audio') return <svg {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
  if (kind === 'link') return <svg {...p}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>;
  return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>;
}
// Built on the real Photo gallery kit (agent-chat/gallery.html): the agent .turn
// anatomy, a .cgal mosaic (first cell .span2, a "+N" .more overlay on overflow),
// a .gal-cap count, and the .chip-btn actions. Classes live in cv6.css already.
function FileGallery({ files, sender, onOpen }) {
  const allImages = files.every((f) => fileKind(f.fileName, f.fileMime) === 'image');
  const shown = files.slice(0, 4);
  const overflow = files.length - shown.length;
  const totalSize = files.reduce((s, f) => s + (f.fileSize || 0), 0);
  return (
    <div className="turn" style={{ marginBottom: 14 }}>
      <div className="tav" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>{sender?.agentInitials || '·'}</div>
      <div className="tbody">
        <div className="tname"><b>{sender?.agentName || 'Files'}</b><span className="tt">{files.length} {allImages ? 'images' : 'files'}</span></div>
        <div className="bubble" style={{ paddingBottom: 13 }}>
          <div className="cgal">
            {shown.map((f, i) => {
              const kind = fileKind(f.fileName, f.fileMime);
              const isImg = kind === 'image' && f.attachmentUrl;
              const showMore = overflow > 0 && i === shown.length - 1;
              return (
                <div key={i} className={`ph${i === 0 ? ' span2' : ''}`} onClick={() => onOpen(f)} role="button" style={{ cursor: 'pointer' }}>
                  {isImg ? <img src={f.attachmentUrl} alt={f.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <FileGlyph kind={kind} size={i === 0 ? 30 : 22} />}
                  {!isImg && <span className="mono" style={{ position: 'absolute', left: 6, right: 6, bottom: 5, fontSize: 8.5, color: 'rgba(255,255,255,.62)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{f.fileName}</span>}
                  {showMore && <div className="more">+{overflow}</div>}
                </div>
              );
            })}
          </div>
          <div className="gal-cap">
            <FileGlyph kind={allImages ? 'image' : 'doc'} size={14} />
            <span>{files.length} {allImages ? 'images' : 'files'}{totalSize ? ` · ${fmtSize(totalSize)}` : ''}</span>
          </div>
        </div>
        <div className="chips">
          <button className="chip-btn is-primary" onClick={() => onOpen(shown[0])}>Open gallery</button>
          <button className="chip-btn" onClick={() => onOpen(shown[0])}>Send to Review</button>
        </div>
      </div>
    </div>
  );
}
function FilePreview({ file, onClose }) {
  const kind = fileKind(file.fileName, file.fileMime);
  const url = file.attachmentUrl;
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(4,6,9,.7)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--ground)', borderTop: '1px solid var(--hair)', borderRadius: '18px 18px 0 0', padding: '14px 16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))', maxHeight: '82%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <FileGlyph kind={kind} size={18} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.fileName || 'file'}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{kind}{file.fileSize ? ` · ${fmtSize(file.fileSize)}` : ''}</div>
          </div>
          <div onClick={onClose} role="button" className="ib" style={{ width: 32, height: 32, borderRadius: 9 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 120, borderRadius: 12, overflow: 'hidden', background: '#0c0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          {url && kind === 'image' ? <img src={url} alt={file.fileName} style={{ maxWidth: '100%', maxHeight: '46vh', objectFit: 'contain' }} />
            : url && kind === 'video' ? <video src={url} controls style={{ maxWidth: '100%', maxHeight: '46vh' }} />
              : url ? <iframe title={file.fileName} src={url} style={{ width: '100%', height: '46vh', border: 'none', background: '#fff' }} />
                : <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, padding: 24 }}><FileGlyph kind={kind} size={34} /><div style={{ marginTop: 10 }}>This file lives in the room. Open it in Review to see it full size.</div></div>}
        </div>
        <button onClick={() => { if (url) window.open(url, '_blank', 'noopener'); }}
          style={{ height: 44, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
          Review
        </button>
      </div>
    </div>
  );
}
// An agent turn that IS a live Goal Thread (the structured step thread), rendered inline
// as that turn so the conversation history stays above it. The header (avatar + title +
// time) matches a normal turn; the body is the real step thread from the agent's blocks.
function GoalTurn({ m, goal }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <Avatar m={m} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{m.agentName}</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{m.time}</span>
        </div>
        <GoalThreadBody goal={goal} blocks={m.blocks} />
      </div>
    </div>
  );
}

// While a reply is pending, the space under the pinned question shows the agent is on it
// (kit .thinking dot pulse), so a fresh send never looks dead. Replaced the moment the real
// reply (bubble / Goal Thread) starts arriving.
function ThinkingTurn({ room }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>{room?.initials || '·'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{room?.name}</span>
        </div>
        <div className="thinking">
          <span className="dot3"><i /><i /><i /></span>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Working on it…</span>
        </div>
      </div>
    </div>
  );
}

// Walk a run of messages; collapse consecutive file messages into one gallery, and render
// any structured (Goal Thread) message inline as its step thread.
function renderItems(items, onOpenFile, goal) {
  const out = []; let run = [];
  const flush = (key) => { if (run.length) { out.push(<FileGallery key={`g${key}`} files={run} sender={run[0]} onOpen={onOpenFile} />); run = []; } };
  items.forEach((m, i) => {
    if (m.isFile) { run.push(m); }
    else if (m.blocks && m.blocks.length) { flush(i); out.push(<GoalTurn key={i} m={m} goal={goal} />); }
    else { flush(i); out.push(<Message key={i} m={m} />); }
  });
  flush('end');
  return out;
}

// An older day, folded into a one-line card you tap to open.
function DayCard({ group, onOpenFile, goal }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`goalcard${open ? ' is-open' : ''}`} style={{ marginBottom: 10 }}>
      <div className="gc-head" onClick={() => setOpen((v) => !v)}>
        <span className="gc-title">{group.label}</span>
        <span className="gc-meta">{group.items.length} message{group.items.length === 1 ? '' : 's'}</span>
        <svg className="gc-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </div>
      <div className="gc-body">
        {renderItems(group.items, onOpenFile, goal)}
      </div>
    </div>
  );
}

export default function ChatLifecycle({ room, messages, status, onBack, onOpenNav, onSend, goal }) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const [showJump, setShowJump] = useState(false);

  const groups = useMemo(() => groupByDay(messages || []), [messages]);
  const older = groups.slice(0, -1);
  const latest = groups[groups.length - 1] || null;

  // The goal thread's heading is the user's ask. Prefer the live goal title; fall back to
  // the most recent user message so the header reads "Goal: <what you asked>" right away.
  const threadGoal = useMemo(() => {
    if (goal && goal.title) return goal;
    let ask = '';
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      if (messages[i]?.isUser && messages[i].text) { ask = messages[i].text; break; }
    }
    return ask ? { ...(goal || {}), title: ask } : goal;
  }, [goal, messages]);

  const submit = () => { const t = draft.trim(); if (!t) return; onSend?.(t); setDraft(''); };

  // Send behavior (design contract, drop 7): a fresh message is NOT bottom-stuck. We pin
  // the just-sent user message to the TOP of the view and let the agent's reply grow
  // downward beneath it (thinking, then bubble / Goal Thread). It stays pinned until you
  // scroll or send again. So while a reply is pending we reserve a viewport of room below.
  const lastMsg = messages?.length ? messages[messages.length - 1] : null;
  const awaiting = !!lastMsg && lastMsg.isUser; // sent, no agent reply yet
  const lastUserSig = useMemo(() => {
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      if (messages[i]?.isUser) return `${i}:${messages[i].ts || messages[i].text || ''}`;
    }
    return '';
  }, [messages]);

  // Scroll so the latest user message sits ~12px under the header (its top edge).
  const pinLastUser = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    const nodes = el.querySelectorAll('[data-userturn]');
    const node = nodes[nodes.length - 1];
    if (!node) return;
    const delta = node.getBoundingClientRect().top - el.getBoundingClientRect().top - 12;
    el.scrollBy({ top: delta, behavior });
  }, []);
  const jumpToLatest = useCallback(() => {
    if (awaiting) pinLastUser('smooth');
    else bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [awaiting, pinLastUser]);

  // The pill shows when scrolled away from the active exchange.
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJump(fromBottom > 240);
  }, []);

  const prevLenRef = useRef(0);
  const prevUserSigRef = useRef('');
  const roomKey = room?.id || room?.name;
  useEffect(() => { prevLenRef.current = 0; prevUserSigRef.current = ''; }, [roomKey]);
  useEffect(() => {
    const el = scrollRef.current;
    const len = messages?.length || 0;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    const prevSig = prevUserSigRef.current;
    prevUserSigRef.current = lastUserSig;
    if (!el || !len) return;
    // First load for this room: land on the active exchange (pin the question if a reply
    // is pending, else the tail).
    if (prev === 0) { if (awaiting) pinLastUser('auto'); else bottomRef.current?.scrollIntoView(); return; }
    // A NEW user message was just sent -> pin it to the top; the answer fills in below.
    if (lastUserSig && lastUserSig !== prevSig && awaiting) { pinLastUser('smooth'); return; }
    // Agent reply streaming in beneath the pinned question: leave the scroll alone unless
    // you're right at the tail watching it (then keep the newest in view).
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (!awaiting && fromBottom < 200) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, roomKey, awaiting, lastUserSig, pinLastUser]);

  const empty = status === 'empty' || !messages?.length;
  const [preview, setPreview] = useState(null);
  const openFile = useCallback((f) => setPreview(f), []);

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
        {/* Cap the thread to a readable column so on iPad it stays phone-width and centered,
            instead of stretching messages + cards edge to edge. */}
        <SendCtx.Provider value={onSend || (() => {})}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
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
                  <DayCard group={g} onOpenFile={openFile} goal={threadGoal} />
                </React.Fragment>
              ))}
              {latest && (
                <>
                  <div className="daydiv"><span>{latest.label.toUpperCase()}</span></div>
                  {renderItems(latest.items, openFile, threadGoal)}
                </>
              )}
              {/* Reply pending: the agent is on it, shown right under the pinned question. */}
              {awaiting && <ThinkingTurn room={room} />}
            </>
          )}
          {/* Reserve a viewport of room below the pinned question while a reply is pending,
              so the just-sent message can sit at the top and the answer grows into the space
              beneath it (design send-behavior). Collapses once the reply has landed. */}
          <div style={{ height: awaiting ? '78vh' : 4 }} />
          <div ref={bottomRef} style={{ height: 4 }} />
        </div>
        </SendCtx.Provider>
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

      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
