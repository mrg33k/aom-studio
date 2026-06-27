// cv6next — Chat, desktop (the 3-column design: rooms rail · goal thread · control drawer).
// Faithful to ccds6 wired/tools/chat.html (chat-desktop node), built in React because the
// center thread is dynamic (per-step-type markup a single data-each can't express). Reuses
// GoalThreadBody so mobile and desktop render the exact same live thread. Real data only:
// rail from useChatList, thread + goal from useRoomThread/useGoalThread, composer + choice
// taps post a real message. Secondary drawer actions (pause/re-task/approve/handoff) have no
// honest store yet, so they stay inert (not faked), matching Command/Tracker desktop.

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useChatList, useProjectMissions } from './data/useHomeData.js';
import { authFetch } from '../lib/authFetch';
import { useRoomThread, useGoalThread, useRoomPlan } from './data/useRoomThread.js';
import { GoalThreadBody, SendCtx, AgentBlocks, PlanPanel, buildSteps, WorkingTurn } from './ChatGoalThread.jsx';
import Cv6FullComposer from './Cv6FullComposer.jsx';
import MessageAttachments from './MessageAttachments.jsx';
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx';

const NAV = [
  { k: 'home', label: 'Home', d: 'M3 11l9-7 9 7|M5 9.8V20h14V9.8' },
  { k: 'chat', label: 'Chat', d: 'M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z' },
  { k: 'support', label: 'Support', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z' },
  { k: 'tracker', label: 'Tracker', d: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z|M12 2v3M12 19v3M2 12h3M19 12h3' },
  { k: 'command', label: 'Command', d: 'M7 4H4v16h3M17 4h3v16h-3' },
];

function NavTile({ item, active, onNav }) {
  const paths = item.d.split('|');
  return (
    <div className={`ctile${active ? ' on' : ''}`} onClick={() => onNav?.(item.k)} style={{ cursor: 'pointer' }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths.map((p, i) => <path key={i} d={p} />)}</svg>
      <span className="clab">{item.label}</span>
    </div>
  );
}

function RoomRow({ row, open, onClick }) {
  return (
    <div className="room" onClick={onClick} style={{ cursor: 'pointer', background: open ? 'var(--accent-weak)' : undefined }}>
      <span className={`sdot is-${row.status || 'ready'}`} style={{ flex: 'none' }} />
      <span className="rn" style={{ fontWeight: open ? 600 : 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
      {row.statusLabel ? <span style={{ fontSize: 10.5, color: open ? 'var(--accent)' : 'var(--faint)', fontWeight: 600 }}>{row.statusLabel.toLowerCase()}</span> : null}
    </div>
  );
}

// The project folder is shown above, so drop a redundant "Parent:" prefix from the mission
// name (e.g. "Andocia Deal:Deal Shape" -> "Deal Shape"). Clean names pass through.
function missionLabelClean(n) { const s = String(n || ''); return (s.includes(':') ? s.slice(s.lastIndexOf(':') + 1).trim() : s) || s; }
// Map a raw mission status to the CV6 status-dot class (live / ready / done).
function missionDot(s) {
  const v = String(s || '').toLowerCase();
  if (['running', 'building', 'active'].includes(v)) return 'live';
  if (['done', 'complete', 'completed'].includes(v)) return 'done';
  return 'ready';
}

// ── Files & Links shelf (right-column "Files" view) ──────────────────────────
// Classify a shared file into a pill bucket from its mime + extension.
function fileKind(name, mime) {
  const m = String(mime || '').toLowerCase();
  const ext = String(name || '').toLowerCase().split('.').pop();
  if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'avif'].includes(ext)) return 'photo';
  if (m.startsWith('video/') || ['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv'].includes(ext)) return 'video';
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  return 'file';
}
// A file's openable URL. An absolute http(s) link opens as-is; a corner path goes through the
// authed file endpoint (raw bytes) so it never 404s on a bare path.
function fileHref(url) {
  const u = String(url || '');
  if (/^https?:\/\//i.test(u)) return u;
  return `/api/dashboard/project-file?path=${encodeURIComponent(u.replace(/^\/+/, ''))}&raw=1`;
}
// Pull every real link out of a message: markdown [text](url) first, then bare urls. Trailing
// punctuation is stripped so the URL is valid and the click never lands on a 404 from a stray
// ")" or ".". Agents send a lot of links; these are the priority to get right.
function extractLinks(text) {
  const s = String(text || '');
  const out = [];
  const seen = new Set();
  const push = (raw) => {
    let u = String(raw || '').replace(/[.,;:!?)\]}'"]+$/, '');
    if (!/^https?:\/\//i.test(u)) return;
    if (seen.has(u)) return;
    seen.add(u); out.push(u);
  };
  let m;
  const md = /\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  while ((m = md.exec(s))) push(m[1]);
  const bare = /(https?:\/\/[^\s<>()\[\]]+)/g;
  while ((m = bare.exec(s))) push(m[1]);
  return out;
}
// A short human label for a link (host + first path segment), so the row is scannable.
function linkLabel(url) {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean)[0];
    return u.hostname.replace(/^www\./, '') + (seg ? `/${seg}` : '');
  } catch { return String(url).replace(/^https?:\/\//, '').slice(0, 40); }
}
// Short "how long ago" + human file size, for the per-row meta line (who · when · size).
function relAgo(ts) {
  if (!ts) return '';
  const ms = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now'; if (m < 60) return `${m}m`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
function humanSize(bytes) {
  const b = Number(bytes) || 0; if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
// Build the de-duped, newest-first shelf of files + links from the loaded thread. Each item
// carries who shared it, how long ago, and (for files) its size — the design's row meta.
function shelfItems(messages) {
  const items = [];
  for (const msg of messages || []) {
    const who = msg.isUser ? 'You' : (msg.agentName || '');
    // Read the same `attachments` array the in-thread file cards use (one message can carry
    // several files); fall back to the legacy single attachment if that's all there is.
    const atts = (Array.isArray(msg.attachments) && msg.attachments.length)
      ? msg.attachments
      : (msg.attachmentUrl && msg.fileName ? [{ url: msg.attachmentUrl, name: msg.fileName, mime: msg.fileMime, size: msg.fileSize }] : []);
    for (const att of atts) {
      if (!att?.url || !att?.name) continue;
      items.push({ type: 'file', kind: fileKind(att.name, att.mime), name: att.name, url: att.url, mime: att.mime, ts: msg.ts || null, who, size: att.size || 0 });
    }
    for (const url of extractLinks(msg.text)) {
      items.push({ type: 'link', kind: 'link', name: linkLabel(url), url, ts: msg.ts || null, who });
    }
  }
  items.sort((a, b) => (new Date(b.ts || 0).getTime() || 0) - (new Date(a.ts || 0).getTime() || 0));
  return items;
}
// "Elon · 1h · 8 KB" style meta line — only the parts we actually have. Library files have no
// size/author, so they fall back to their kind (canon / deliverable / research) + when.
function itemMeta(it) {
  const tail = it.type === 'link' ? 'link' : (humanSize(it.size) || it.libKind || '');
  return [it.who, relAgo(it.ts), tail].filter(Boolean).join(' · ');
}
// Map a project-files kind/name to a pill bucket + a clean kind label.
function libKindLabel(k) {
  return ({ canon: 'doc', tape: 'notes', 'research-drop': 'research', deliverable: 'deliverable' })[k] || (k || 'file');
}
const FILE_PILLS = [
  { k: 'all', label: 'All' }, { k: 'recent', label: 'Recent' }, { k: 'photo', label: 'Photos' },
  { k: 'video', label: 'Video' }, { k: 'pdf', label: 'PDFs' }, { k: 'link', label: 'Links' },
];
function pillFilter(items, pill) {
  if (pill === 'all') return items;
  if (pill === 'recent') return items.slice(0, 12);
  if (pill === 'link') return items.filter((i) => i.type === 'link');
  return items.filter((i) => i.kind === pill);
}
function fileGlyph(kind) {
  const c = kind === 'photo' ? 'var(--accent)' : kind === 'video' ? '#ec4899' : kind === 'pdf' ? '#f59e0b' : 'var(--muted)';
  const d = kind === 'photo' ? 'M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6'
    : kind === 'video' ? 'M23 7l-7 5 7 5V7Z M1 5h15v14H1z'
    : 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6';
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
function FilesShelf({ items, onReview }) {
  const [pill, setPill] = useState('all');
  const counts = useMemo(() => ({
    all: items.length, recent: Math.min(items.length, 12),
    photo: items.filter((i) => i.kind === 'photo').length,
    video: items.filter((i) => i.kind === 'video').length,
    pdf: items.filter((i) => i.kind === 'pdf').length,
    link: items.filter((i) => i.type === 'link').length,
  }), [items]);
  const filtered = pillFilter(items, pill);
  const CAP = 60; // a busy project has hundreds of files; render the newest CAP, note the rest.
  const shown = filtered.slice(0, CAP);
  const overflow = filtered.length - shown.length;
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {FILE_PILLS.map((p) => {
          const on = pill === p.k; const n = counts[p.k];
          return (
            <button key={p.k} onClick={() => setPill(p.k)} style={{ height: 28, padding: '0 11px', borderRadius: 14, border: `1px solid ${on ? 'transparent' : 'var(--hair)'}`, background: on ? 'var(--accent)' : 'var(--surface-2)', color: on ? '#fff' : 'var(--muted)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
              {p.label}{n ? ` ${n}` : ''}
            </button>
          );
        })}
      </div>
      {shown.length ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {shown.map((it, i) => (it.type === 'link' ? (
            <a key={i} href={it.url} target="_blank" rel="noopener noreferrer" title={it.url} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--divider)', textDecoration: 'none' }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemMeta(it)}</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M7 17 17 7M7 7h10v10" /></svg>
            </a>
          ) : (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{fileGlyph(it.kind)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemMeta(it)}</div>
              </div>
              <a href={fileHref(it.url)} target="_blank" rel="noopener noreferrer" title="Open the file" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none', padding: '5px 9px', borderRadius: 8, border: '1px solid var(--hair)', flex: 'none' }}>Open</a>
              <button onClick={() => onReview?.(it)} title="Open in the Review tab" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-weak)', border: 'none', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', flex: 'none' }}>Review</button>
            </div>
          )))}
          {overflow > 0 ? <div className="mono" style={{ fontSize: 10.5, color: 'var(--faint)', padding: '10px 4px' }}>+{overflow} more · filter or search to narrow</div> : null}
        </div>
      ) : (
        <div style={{ color: 'var(--faint)', fontSize: 12.5 }}>{pill === 'link' ? 'No links shared here yet.' : 'No files here yet.'}</div>
      )}
    </>
  );
}

// A project in the rail is a folder that fans open to its missions. The row itself opens the
// project's general chat; the chevron toggles the mission list; a mission row opens that
// mission's own thread on the right. Mirrors the mobile project screen, here as a tree.
const MISSION_CAP = 8; // a fanned-open project shows this many missions, then "show N more" — keeps the rail scannable when a project has dozens.
function ProjectGroup({ row, selectedProject, selectedMissionSlug, missions, expanded, onToggle, onPickProject, onPickMission }) {
  const hasMissions = missions && missions.length > 0;
  const [showAll, setShowAll] = useState(false);
  const slugOf = (m) => (String(m.slug || '').includes(':') ? m.slug : `${row.slug}:${m.slug}`);
  const selectedIdx = missions.findIndex((m) => slugOf(m) === selectedMissionSlug);
  // Always show the full list if asked, or if the selected mission sits past the cap (so it stays visible).
  const showEvery = showAll || selectedIdx >= MISSION_CAP;
  const shownMissions = showEvery ? missions : missions.slice(0, MISSION_CAP);
  const hiddenCount = missions.length - shownMissions.length;
  return (
    <div>
      <div className="room" onClick={onPickProject} style={{ cursor: 'pointer', background: selectedProject ? 'var(--accent-weak)' : undefined }}>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label={expanded ? 'Hide missions' : 'Show missions'}
          style={{ border: 'none', background: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', flex: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><path d="m9 18 6-6-6-6" /></svg>
        </button>
        <svg className={`folder is-${row.tint || 'violet'}`} width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
        <span className="rn" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: selectedProject ? 600 : 500 }}>{row.name}</span>
        {hasMissions ? <span style={{ fontSize: 11, color: 'var(--faint)', flex: 'none' }}>{missions.length}</span> : null}
      </div>
      {expanded ? (
        <div style={{ margin: '2px 0 6px 16px', borderLeft: '1px solid var(--divider)', paddingLeft: 6 }}>
          {hasMissions ? shownMissions.map((m) => {
            const missionSlug = slugOf(m);
            const on = selectedMissionSlug === missionSlug;
            return (
              <div key={m.slug} className="room" onClick={() => onPickMission(m)} style={{ cursor: 'pointer', background: on ? 'var(--accent-weak)' : undefined, paddingTop: 7, paddingBottom: 7 }}>
                <span className={`sdot is-${missionDot(m.status)}`} style={{ flex: 'none' }} />
                <span className="rn" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: on ? 600 : 500, color: on ? 'var(--fg)' : 'var(--muted)' }}>{missionLabelClean(m.name || m.slug)}</span>
              </div>
            );
          }) : <div style={{ fontSize: 12, color: 'var(--faint)', padding: '6px 8px' }}>No missions yet.</div>}
          {hiddenCount > 0 ? (
            <div className="room" onClick={() => setShowAll(true)} style={{ cursor: 'pointer', paddingTop: 7, paddingBottom: 7, color: 'var(--accent)', fontSize: 12.5, fontWeight: 600 }}>Show {hiddenCount} more</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Group plain messages (oldest -> newest) into day buckets, preserving order. Mirrors
// ChatLifecycle's mobile grouping so desktop reads the same: latest day open inline,
// older days folded into one-line cards (the "jumbled pile" fix, ported to desktop).
function dayKeyD(ts) {
  const d = ts ? new Date(ts) : null;
  if (!d || Number.isNaN(d.getTime())) return 'na';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function dayLabelD(ts) {
  const d = ts ? new Date(ts) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Earlier';
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function groupByDayD(messages) {
  const groups = []; let cur = null;
  for (const m of messages) {
    const k = dayKeyD(m.ts);
    if (!cur || cur.key !== k) { cur = { key: k, label: dayLabelD(m.ts), items: [] }; groups.push(cur); }
    cur.items.push(m);
  }
  return groups;
}

// Group consecutive messages from the same sender (one avatar + name + timestamp,
// N bubbles) per the CV6 design system's plain-conversation kit.
function groupChat(messages) {
  const groups = [];
  for (const m of messages || []) {
    const key = m.isUser ? '__you' : (m.agentName || 'agent');
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, isUser: !!m.isUser, items: [m] });
  }
  return groups;
}

// The rich content of one message (blocks + attachments), shown below its bubble.
function MsgExtras({ m, onSend }) {
  const handleReview = (attachment) => { if (onSend) onSend({ type: 'review', attachment }); };
  return (
    <>
      {/* A finished thread folds into the openable WorkDoneCard; lone answer blocks render
          inline. (A still-working thread renders as the live GoalThreadBody at the top level,
          so it never reaches here.) AgentBlocks decides. */}
      {m.blocks?.length ? (
        <div style={{ marginTop: 8, width: '100%' }}>
          <AgentBlocks blocks={m.blocks} />
        </div>
      ) : null}
      {m.attachments?.length ? (
        <div style={{ marginTop: 8, width: '100%' }}>
          <MessageAttachments attachments={m.attachments} onReview={handleReview} />
        </div>
      ) : null}
    </>
  );
}

// One grouped run of messages, rendered as bubbles (agent left / you right).
function BubbleGroup({ group, onSend }) {
  const head = group.items[0];
  const lastTime = group.items[group.items.length - 1].time;
  if (group.isUser) {
    return (
      <div className="me">
        {group.items.map((m, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {m.text ? <div className="pb-me">{m.text}</div> : null}
            <MsgExtras m={m} onSend={onSend} />
          </span>
        ))}
        {lastTime ? <div className="ts">{lastTime}</div> : null}
      </div>
    );
  }
  return (
    <div className="grp">
      <span className={`ava is-${head.agentTint || 'violet'}`} style={{ width: 30, height: 30, fontSize: 11, flex: 'none', borderRadius: 9 }}>{head.agentInitials}</span>
      <div className="stack">
        {head.agentName ? <div className="gname">{head.agentName}</div> : null}
        {group.items.map((m, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {m.text ? <div className="pb"><ChatMessageRenderer content={m.text} /></div> : null}
            <MsgExtras m={m} onSend={onSend} />
          </span>
        ))}
        {lastTime ? <div className="ts">{lastTime}</div> : null}
      </div>
    </div>
  );
}

// A run of messages rendered as grouped bubbles.
function BubbleThread({ messages, onSend }) {
  return (
    <div className="pconv">
      {groupChat(messages).map((g, i) => <BubbleGroup key={i} group={g} onSend={onSend} />)}
    </div>
  );
}

// An older day, folded into a one-line card you tap to open (reuses the .goalcard CSS).
function DesktopDayCard({ group, onSend }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`goalcard${open ? ' is-open' : ''}`}>
      <div className="gc-head" onClick={() => setOpen((v) => !v)}>
        <span className="gc-title">{group.label}</span>
        <span className="gc-meta">{group.items.length} message{group.items.length === 1 ? '' : 's'}</span>
        <svg className="gc-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </div>
      <div className="gc-body">
        <div style={{ paddingTop: 8 }}>
          <BubbleThread messages={group.items} onSend={onSend} />
        </div>
      </div>
    </div>
  );
}

// Live "agent is working" turn shown the instant you send, until the reply lands.
// This is the SAME Goal Thread renderer the finished turn uses — born immediately with the
// goal = your ask, its steps ticking (done rows + a newest active row) in real time as the
// agent works — so the thread BUILDS in front of you instead of a throwaway strip that gets
// replaced by a finished dump at the end (corner:corner-ui-cv6 agent-talk live-feel round).
// WorkingTurn now lives in ChatGoalThread.jsx (shared by every chat surface — the bulletproof
// single source of the "agent is working" strip). Imported above.

function PlainThread({ messages, onSend }) {
  if (!messages?.length) return <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>No messages in this room yet. Start the conversation below.</div>;
  const groups = groupByDayD(messages);
  const older = groups.slice(0, -1);
  const latest = groups[groups.length - 1] || null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {older.map((g, i) => <DesktopDayCard key={`${g.key}-${i}`} group={g} onSend={onSend} />)}
      {latest && (
        <>
          <div className="daydiv"><span>{latest.label.toUpperCase()}</span></div>
          <BubbleThread messages={latest.items} onSend={onSend} />
        </>
      )}
    </div>
  );
}

export default function ChatDesktop({ worldId, initialRoom, onNav, onOpenNav, onReviewFile }) {
  const { data: list } = useChatList();
  // Stable refs so the memoized composer below doesn't re-mount on every list poll.
  const agents = useMemo(() => list?.agents || [], [list]);
  const projects = useMemo(() => list?.projects || [], [list]);

  // Selected room: the one opened from elsewhere, else the first agent. {id,name,initials,isProject,status}.
  const [picked, setPicked] = useState(initialRoom || null);
  // ← chain (Patrik 2026-06-25): from an open thread, ArrowLeft drops back to the chat directory
  // (rail visible, no thread); ArrowLeft again goes Home. 'cleared' forces the directory state.
  const [cleared, setCleared] = useState(false);
  useEffect(() => { setCleared(false); }, [initialRoom?.id]); // a freshly opened room shows its thread
  const selected = useMemo(() => {
    if (cleared) return null;
    if (picked) return picked;
    const a = agents[0];
    return a ? { id: a.id, name: a.name, initials: a.initials, status: a.status, statusText: a.statusLabel } : null;
  }, [cleared, picked, agents]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft') return;
      const f = document.activeElement;
      if (f && (f.tagName === 'INPUT' || f.tagName === 'TEXTAREA' || f.isContentEditable)) return;
      e.preventDefault();
      if (selected) { setCleared(true); setPicked(null); } // back to the chat directory
      else { onNav?.('home'); }                            // already in the directory -> Home
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onNav]);

  const { messages, blocks, send, awaiting, liveSteps } = useRoomThread(worldId, selected);
  const goal = useGoalThread(worldId, selected);
  // The editable forward plan for this room (goal-thread-plan mission) — drives the
  // interactive "Context / goals" plan in the right control column.
  const { plan, actions: planActions } = useRoomPlan(worldId, selected);
  // The top-level live thread shows ONLY while work is in progress (at least one step not
  // done). Once every step is done the thread is finished: it falls to PlainThread, where the
  // message's blocks fold into the openable WorkDoneCard (a record), instead of staying
  // expanded as if still ticking. Matches the quick-panel behaviour (the two must agree).
  const liveThread = (() => {
    const s = buildSteps(blocks);
    return s.length > 0 && !s.every((x) => x.state === 'done');
  })();
  // The working thread's header reads as the user's ask: prefer the room goal, else the most
  // recent thing you sent, so it shows "Goal: <what you asked>" the instant the reply is pending.
  const askGoal = useMemo(() => {
    if (goal?.title) return goal;
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m?.isUser && m.text) return { title: m.text };
    }
    return goal;
  }, [goal, messages]);

  // A "Review"/"Review all" tap on a message attachment must OPEN the Review tool on
  // those exact files (live), not post a chat message. handleReview hands us a single
  // file or an array; everything else (Result block actions, text) flows to send.
  const reviewProject = selected?.projectSlug || (selected?.isProject ? selected.id : '');
  const handleThreadAction = useCallback((a) => {
    if (a && typeof a === 'object' && a.type === 'review') {
      const att = a.attachment;
      const files = Array.isArray(att) ? att : (att ? [att] : null);
      if (files && files.length) onReviewFile?.(files, reviewProject);
      return undefined;
    }
    return send?.(a);
  }, [send, onReviewFile, reviewProject]);

  // Right column: Goals view (the agent's goal/steps) or Files view (this conversation's files + links).
  const [drawerView, setDrawerView] = useState('goals');

  // "Following along" is real, user-owned state: which rooms surface on Home + notify you.
  // Persisted locally per room so the toggle sticks across visits without a new backend.
  const roomKey = selected?.id || selected?.missionSlug || selected?.name || '';
  const [following, setFollowing] = useState(true);
  useEffect(() => {
    if (!roomKey) return;
    try {
      const muted = JSON.parse(localStorage.getItem('cv6.mutedRooms') || '{}');
      setFollowing(!muted[roomKey]);
    } catch { setFollowing(true); }
  }, [roomKey]);
  const toggleFollow = () => {
    setFollowing((prev) => {
      const next = !prev;
      try {
        const muted = JSON.parse(localStorage.getItem('cv6.mutedRooms') || '{}');
        if (next) delete muted[roomKey]; else muted[roomKey] = 1;
        localStorage.setItem('cv6.mutedRooms', JSON.stringify(muted));
      } catch { /* localStorage unavailable: keep in-memory only */ }
      return next;
    });
  };
  // The "..." menu on the agent card (Goals view).
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  useEffect(() => { setAgentMenuOpen(false); }, [roomKey]);

  // ── Working agent controls ───────────────────────────────────────────────
  // These are real, not decorative: each posts through the same message path
  // (send) that already reaches the running room agent, or uploads a real file.
  // A short confirmation line shows what was sent, so the control never feels dead.
  const fileInputRef = useRef(null);
  const [controlNote, setControlNote] = useState('');
  const [controlBusy, setControlBusy] = useState(false);
  useEffect(() => { setControlNote(''); }, [roomKey]);
  const flashNote = (msg) => { setControlNote(msg); };
  const sendControl = async (text, note) => {
    setControlBusy(true);
    const ok = await send(text);
    setControlBusy(false);
    flashNote(ok ? note : 'Could not reach the agent. Try again.');
  };
  const approvePlan = () => sendControl('Approved. Go ahead with the current plan.', 'Sent your approval.');
  const handoffAgent = () => sendControl('Please hand this off to another agent. Tell me who you are handing it to and why.', 'Asked for a hand off.');
  const pauseAgent = () => sendControl('Please pause here and wait for my next message before continuing.', 'Asked the agent to pause.');
  const retaskAgent = () => {
    // Re-tasking is freeform, so focus the composer for the new instruction.
    const box = composerHost?.querySelector('input:not([type="file"]):not([type="hidden"]), textarea');
    if (box) { box.focus(); flashNote('Type the new task below.'); }
    else flashNote('Type the new task in the box below.');
  };
  const onPickFile = () => fileInputRef.current?.click();
  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setControlBusy(true);
    try {
      const data_base64 = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
        fr.onerror = reject;
        fr.readAsDataURL(file);
      });
      const scope = selected?.isMission
        ? { project: selected.projectSlug, mission: String(selected.missionSlug || selected.id || '').split(':').pop() }
        : selected?.isProject ? { project: selected.id } : { agent: selected?.id };
      const r = await authFetch('/api/dashboard/file-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: worldId, filename: file.name, data_base64, mime_type: file.type || 'application/octet-stream', scope }),
      });
      const d = r && r.ok ? await r.json() : null;
      if (d?.url) {
        // Announce it the canonical way useRoomThread parses into a file card.
        await send(`Attached file: ${file.name}\n${d.url}`);
        flashNote(`Added ${file.name}.`);
      } else {
        flashNote('Upload failed. Try again.');
      }
    } catch {
      flashNote('Upload failed. Try again.');
    } finally {
      setControlBusy(false);
    }
  };
  // The room's REAL file library (project-files: canon, deliverables, research, per-mission),
  // so the Files panel is never empty for a project/mission room — not just what got posted in
  // the chat. Agent rooms have no project library, so they keep the conversation's files+links.
  const libProjectSlug = selected?.isMission ? selected.projectSlug : (selected?.isProject ? selected.id : null);
  const [roomFiles, setRoomFiles] = useState([]);
  useEffect(() => {
    if (!libProjectSlug) { setRoomFiles([]); return undefined; }
    let alive = true;
    authFetch(`/api/dashboard/project-files?slug=${encodeURIComponent(libProjectSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const flat = [];
        for (const f of (d.files || [])) flat.push(f);
        for (const m of (d.missions || [])) for (const f of (m.files || [])) flat.push(f);
        setRoomFiles(flat);
      })
      .catch(() => { if (alive) setRoomFiles([]); });
    return () => { alive = false; };
  }, [libProjectSlug]);
  // Shelf = the room's library files (project/mission rooms) + links from the conversation;
  // agent rooms fall back to whatever files/links the conversation itself carries.
  const shelf = useMemo(() => {
    const convo = shelfItems(messages);
    if (!libProjectSlug) return convo;
    const lib = roomFiles.map((f) => ({
      type: 'file', kind: fileKind(f.name), name: f.name, url: f.path, path: f.path,
      ts: f.last_modified || null, who: '', size: 0, libKind: libKindLabel(f.kind),
    }));
    const links = convo.filter((i) => i.type === 'link');
    const merged = [...lib, ...links];
    merged.sort((a, b) => (new Date(b.ts || 0).getTime() || 0) - (new Date(a.ts || 0).getTime() || 0));
    return merged;
  }, [messages, roomFiles, libProjectSlug]);
  // Host node the rich CV4 composer (ThreadInputBar: command menu / voice / image
  // gen) portals into. Cv6FullComposer is mounted ONCE at the end of the tree and
  // kept alive; it only paints when a room is open + this host exists, so a thread
  // poll re-render never remounts it. Restored 2026-06-26 once `selected` + `send`
  // became referentially stable across polls (the churn that stole focus before).
  const [composerHost, setComposerHost] = useState(null);
  // Pin to the latest message: after the thread loads (messages arrive async) and whenever a
  // new one lands, so opening a room lands at the tail and your just-sent message isn't hidden
  // below the fold. Reading history (scrolled up) is left alone.
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const prevLenRef = useRef(0);
  const selKey = selected?.id || '';
  useEffect(() => { prevLenRef.current = 0; }, [selKey]);
  useEffect(() => {
    const el = scrollRef.current;
    const len = messages?.length || 0;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (!el || !len) return;
    // The thread polls every 3s and hands back a fresh array each time. Only move the scroll
    // when a NEW message actually arrived (len grew) or on first load — never on an identical
    // re-render, which is what made the view jump every few seconds.
    if (len === prev) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (prev === 0) bottomRef.current?.scrollIntoView();
    else if (fromBottom < 400) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selKey]);

  const pickAgent = (a) => setPicked({ id: a.id, name: a.name, initials: a.initials, status: a.status, statusText: a.statusLabel });
  const pickProject = (p) => setPicked({ id: p.id, name: p.name, initials: (p.name || '?').slice(0, 2).toUpperCase(), isProject: true, status: p.status, statusText: 'project chat' });
  const pickMission = (p, m) => { const nm = missionLabelClean(m.name || m.slug); setPicked({ id: m.slug, name: nm, initials: (nm || '?').slice(0, 2).toUpperCase(), isMission: true, missionSlug: String(m.slug || '').includes(':') ? m.slug : `${p.slug}:${m.slug}`, projectSlug: p.slug, status: missionDot(m.status), statusText: p.name }); };

  // Real missions per project (same endpoint the mobile project screen uses). Each project
  // row fans open to these; clicking one opens that mission's own thread.
  const missionsByProject = useProjectMissions(worldId);
  const [expanded, setExpanded] = useState(() => new Set());
  const toggleProject = (slug) => setExpanded((prev) => { const n = new Set(prev); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });
  // Fan open ONLY the project we arrive on (from Home) — keyed on initialRoom, not on every
  // selection. After arrival, expansion is fully user-driven, so a manual collapse always sticks
  // (clicking a project row again closes it; the effect won't re-open it).
  useEffect(() => {
    const slug = initialRoom?.isMission ? initialRoom.projectSlug
      : (initialRoom?.isProject ? ((projects.find((p) => p.id === initialRoom.id) || {}).slug || initialRoom.id) : null);
    if (slug) setExpanded((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));
  }, [initialRoom?.id, initialRoom?.isProject, initialRoom?.isMission, projects]);

  return (
    <SendCtx.Provider value={send || (() => {})}>
      <div data-cv6 data-theme="dark" className="cv6-screen" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* topbar now mounted once in the shell (SharedNav DesktopNav) */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* rooms rail */}
          <div style={{ width: 220, flex: 'none', borderRight: '1px solid var(--divider)', padding: '18px 12px', overflowY: 'auto' }}>
            <div className="eyebrow" style={{ margin: '0 6px 8px' }}>Agents</div>
            <div style={{ marginBottom: 16 }}>
              {agents.length ? agents.map((a) => <RoomRow key={a.id} row={a} open={selected?.id === a.id && !selected?.isProject} onClick={() => pickAgent(a)} />)
                : <div style={{ color: 'var(--faint)', fontSize: 12, padding: '0 6px' }}>No agents yet.</div>}
            </div>
            <div className="eyebrow" style={{ margin: '0 6px 8px' }}>Projects</div>
            {projects.length ? projects.map((p) => (
              <ProjectGroup key={p.id} row={p}
                selectedProject={selected?.id === p.id && selected?.isProject}
                selectedMissionSlug={selected?.isMission ? selected.missionSlug : null}
                missions={missionsByProject[p.slug] || []}
                expanded={expanded.has(p.slug)}
                onToggle={() => toggleProject(p.slug)}
                onPickProject={() => { pickProject(p); toggleProject(p.slug); }}
                onPickMission={(m) => pickMission(p, m)} />
            ))
              : <div style={{ color: 'var(--faint)', fontSize: 12, padding: '0 6px' }}>No projects yet.</div>}
          </div>

          {/* conversation */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {selected ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 24px', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ position: 'relative', flex: 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700 }}>{selected.initials || '·'}</div>
                    <span className={`sdot is-${selected.status || 'ready'}`} style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, border: '2.5px solid var(--ground)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{goal?.title ? <>Goal: {goal.title}</> : (selected.statusText || 'conversation')}</div>
                  </div>
                  <button
                    onClick={toggleFollow}
                    title={following ? 'You will see this room on Home and get its updates. Click to mute.' : 'Muted. Click to follow along again.'}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 'none', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', padding: '6px 12px', borderRadius: 18, border: following ? 'none' : '1px solid var(--hair)', color: following ? 'var(--success)' : 'var(--muted)', background: following ? 'var(--success-weak)' : 'var(--surface-2)' }}>
                    {following ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    )}
                    {following ? 'Following along' : 'Follow'}
                  </button>
                </div>
                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
                  {/* Readable column cap so a wide screen (iPad landscape, big desktop) keeps
                      the thread + its tables/charts centered instead of stretched. Widened
                      2026-06-25 so the conversation fills the column instead of feeling cramped. */}
                  <div style={{ maxWidth: 920, margin: '0 auto' }}>
                    {liveThread ? <GoalThreadBody goal={goal} blocks={blocks} /> : <PlainThread messages={messages} onSend={handleThreadAction} />}
                    {awaiting ? <WorkingTurn room={selected} steps={liveSteps} goal={askGoal} /> : null}
                    <div ref={bottomRef} style={{ height: 4 }} />
                  </div>
                </div>
                {/* Rich CV4 composer host — Cv6FullComposer portals its ThreadInputBar
                    (command menu, voice, image gen, attachments) in here. It sends
                    through the same useRoomThread.send the thread already polls. */}
                <div ref={setComposerHost} style={{ borderTop: '1px solid var(--divider)', padding: '12px 24px' }} />
              </>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Pick a room on the left to open its thread.</div>
            )}
          </div>

          {/* control drawer */}
          <div style={{ width: 316, flex: 'none', borderLeft: '1px solid var(--divider)', padding: 20, overflowY: 'auto' }}>
            {selected ? (
              <>
                {/* Goals | Files toggle — choose what this column shows. */}
                <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--surface-2)', border: '1px solid var(--hair)', borderRadius: 11, marginBottom: 16 }}>
                  {[['goals', 'Goals'], ['files', 'Files']].map(([k, label]) => (
                    <button key={k} onClick={() => setDrawerView(k)} style={{ flex: 1, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', background: drawerView === k ? 'var(--accent)' : 'transparent', color: drawerView === k ? '#fff' : 'var(--muted)' }}>{label}</button>
                  ))}
                </div>
                {drawerView === 'files' ? (
                  <FilesShelf items={shelf} onReview={(it) => onReviewFile?.(it, reviewProject)} />
                ) : (
                <>
                {/* 1. Who/what is selected. A project room has no single agent, so label it as the room, not "Agent on this goal". */}
                <div className="eyebrow" style={{ color: 'var(--muted)', marginBottom: 10 }}>{selected.isMission ? 'Mission' : selected.isProject ? 'Project room' : 'Agent on this goal'}</div>
                <div style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: 14, padding: 14, marginBottom: 20, position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="ava is-green" style={{ width: 34, height: 34, fontSize: 12 }}>{selected.initials || '·'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{selected.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{selected.statusText || 'ready'}</div>
                    </div>
                    <button
                      onClick={() => setAgentMenuOpen((o) => !o)}
                      title="More"
                      style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--hair)', background: agentMenuOpen ? 'var(--accent-weak)' : 'var(--surface-2)', color: agentMenuOpen ? 'var(--accent)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
                    </button>
                  </div>
                  {agentMenuOpen ? (
                    <>
                      <div onClick={() => setAgentMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                      <div style={{ position: 'absolute', top: 46, right: 14, zIndex: 21, minWidth: 184, background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 12, boxShadow: '0 16px 40px -12px rgba(0,0,0,.45)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[
                          { label: 'View files', onClick: () => { setDrawerView('files'); setAgentMenuOpen(false); } },
                          { label: 'Open in Review', onClick: () => { onReviewFile?.(); setAgentMenuOpen(false); } },
                          { label: following ? 'Mute updates' : 'Follow along', onClick: () => { toggleFollow(); setAgentMenuOpen(false); } },
                        ].map((mi) => (
                          <button key={mi.label} onClick={mi.onClick} style={{ display: 'flex', alignItems: 'center', height: 36, padding: '0 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--fg)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)', textAlign: 'left', cursor: 'pointer' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>{mi.label}</button>
                        ))}
                      </div>
                    </>
                  ) : null}
                  {goal?.total ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 13 }}>
                      <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}><div style={{ width: `${goal.pct || 0}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),#6366F1)' }} /></div>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>step {goal.step}/{goal.total}</span>
                    </div>
                  ) : null}
                  {/* Pause asks the agent to stop and wait; Re-task focuses the composer for a new instruction. */}
                  <div style={{ display: 'flex', gap: 7, marginTop: 13 }}>
                    <button onClick={pauseAgent} disabled={controlBusy} style={{ flex: 1, height: 34, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12, fontWeight: 600, cursor: controlBusy ? 'wait' : 'pointer' }} title="Asks the agent to stop and wait for you">Pause</button>
                    <button onClick={retaskAgent} style={{ flex: 1, height: 34, borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} title="Give the agent a new instruction">Re-task</button>
                  </div>
                  {controlNote ? <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--muted)' }}>{controlNote}</div> : null}
                </div>

                {/* 2. Quick actions (held-c: agent task approval backend doesn't exist) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>2</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Quick actions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={onFileChosen} />
                  <button onClick={approvePlan} disabled={controlBusy} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 11px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 500, cursor: controlBusy ? 'wait' : 'pointer' }} title="Tell the agent its current plan is approved">
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--success-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>
                    </span>
                    Approve plan
                  </button>
                  <button onClick={handoffAgent} disabled={controlBusy} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 11px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 500, cursor: controlBusy ? 'wait' : 'pointer' }} title="Ask the agent to hand this off to another agent">
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7"/></svg>
                    </span>
                    Hand off
                  </button>
                  <button onClick={onPickFile} disabled={controlBusy} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 11px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 500, cursor: controlBusy ? 'wait' : 'pointer' }} title="Upload a file into this room">
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </span>
                    {controlBusy ? 'Working…' : 'Add a file'}
                  </button>
                </div>

                {/* 3. Context / Goals */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>3</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Context / goals</span>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <PlanPanel goal={goal} plan={plan} actions={planActions} />
                  {!plan?.length && !goal?.title ? (
                    <div style={{ color: 'var(--faint)', fontSize: 12.5 }}>No plan yet. Add the next step below once a room is moving.</div>
                  ) : null}
                </div>
                </>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
      {/* Rich CV4 composer — mounted once, kept alive. Portals into composerHost
          only when a room is open. Stable props (selected/send/agents/worldId) mean
          a 3s thread poll never remounts it, so typing/focus survive. Falls back to
          a MiniComposer on internal error. */}
      <Cv6FullComposer
        target={selected ? composerHost : null}
        room={selected}
        worldId={worldId}
        agents={agents}
        quickSend={send}
      />
    </SendCtx.Provider>
  );
}
