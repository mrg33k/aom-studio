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
import { supabase } from '../lib/supabase.js';
import { useRoomThread, useGoalThread, rowAttachments } from './data/useRoomThread.js';
import { titleForAgent } from './data/agentTitles.js';
import { buildChecklistRoomOptions } from './data/roomKeys.js';

import { SendCtx, ReviewCtx } from './ChatGoalThread.jsx';
import StreamingDraft from './StreamingDraft.jsx';
import useStickToBottom from './useStickToBottom.js';
import { deriveTurnState, ROOM_STATUS_LABEL, ROOM_STATUS_TONE } from './data/roomStatus.js';
import Cv6FullComposer from './Cv6FullComposer.jsx';
import { Cv6MessageThread } from './MessageThread.jsx';
import { useRunningTasks } from './data/useRunningTasks.js';
import RoomWorkList from './RoomWorkList.jsx';
import RoomRecoveryNotice from './RoomRecoveryNotice.jsx';
import RoomConnectionNotice, { RoomThreadError } from './RoomConnectionNotice.jsx';
import RoutedHereBar from './RoutedHereBar.jsx';
import NewComposer from './NewComposer.jsx';
import RoomSettingsDialog from './RoomSettingsDialog.jsx';
import { useDataContext } from './providers/DataContext.jsx';
import RoomAvatar from './RoomAvatar.jsx';
import { isActiveRoomStatus } from './data/roomIdentity.js';

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

// The amber "waiting on you" badge every rail row can carry (drop 3): fed by the
// per-room needs-you feed (inboxItems), it replaced the catch-up strip and the
// old Files nav badge as THE at-a-glance attention signal.
export function NeedsBadge({ count }) {
  if (!count) return null;
  return <span style={{ minWidth: 17, height: 17, borderRadius: 9, background: 'var(--warn)', color: '#1c1503', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flex: 'none' }}>{count}</span>;
}
function RoomRow({ row, open, onClick, needsCount = 0, worldId }) {
  return (
    <div className="room" role="button" aria-current={open ? 'true' : undefined} onClick={onClick} style={{ cursor: open ? 'default' : 'pointer', background: open ? 'var(--accent-weak)' : undefined }}>
      <RoomAvatar room={row} worldId={worldId} size={30} />
      <span className="rn" style={{ fontWeight: open ? 600 : 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
      <NeedsBadge count={needsCount} />
      {row.statusLabel && !needsCount ? <span style={{ fontSize: 10.5, color: open ? 'var(--accent)' : 'var(--faint)', fontWeight: 600 }}>{row.statusLabel.toLowerCase()}</span> : null}
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
export function fileKind(name, mime) {
  const m = String(mime || '').toLowerCase();
  const ext = String(name || '').toLowerCase().split('.').pop();
  if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'avif'].includes(ext)) return 'photo';
  if (m.startsWith('video/') || ['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv'].includes(ext)) return 'video';
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  return 'file';
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
// "Elon · 1h · 8 KB" style meta line — only the parts we actually have.
function itemMeta(it) {
  return [it.who, relAgo(it.ts), humanSize(it.size)].filter(Boolean).join(' · ');
}
function fileGlyph(kind) {
  const c = kind === 'photo' ? 'var(--accent)' : kind === 'video' ? '#ec4899' : kind === 'pdf' ? '#f59e0b' : 'var(--muted)';
  const d = kind === 'photo' ? 'M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6'
    : kind === 'video' ? 'M23 7l-7 5 7 5V7Z M1 5h15v14H1z'
    : 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6';
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
// ── Files panel view preferences (Patrik 2026-08-06: grid view + chron order) ──
// Persisted so the panel opens the way the user left it. One key for all three
// mount points (home panel, desktop drawer, mobile sheet) — it is one panel to the
// user, and having it open as a grid in one place and a list in another reads as a
// bug. A blocked/absent localStorage just means the defaults come back each time.
export const FILES_PREF_KEY = 'cv6.filesShelf.prefs';
export const FILES_PREF_DEFAULTS = { layout: 'grid', order: 'newest', grouped: true };
export function readFilesPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(FILES_PREF_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return FILES_PREF_DEFAULTS;
    return {
      layout: saved.layout === 'grid' ? 'grid' : 'list',
      order: saved.order === 'oldest' ? 'oldest' : 'newest',
      grouped: saved.grouped !== false,
    };
  } catch { return FILES_PREF_DEFAULTS; }
}
export function writeFilesPrefs(patch) {
  const next = { ...readFilesPrefs(), ...(patch || {}) };
  try { localStorage.setItem(FILES_PREF_KEY, JSON.stringify(next)); } catch { /* private mode — session only */ }
  return next;
}
const tsOf = (it) => (new Date(it?.ts || 0).getTime() || 0);
// A tiny segmented control — three of these make up the panel's toolbar.
function ShelfToggle({ label, value, options, onChange }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--divider)' }}>
      {options.map((opt) => {
        const on = opt.id === value;
        return (
          <button type="button" key={opt.id} aria-pressed={on ? 'true' : 'false'} title={opt.title || opt.label} onClick={() => onChange(opt.id)}
            style={{ height: 24, padding: '0 9px', borderRadius: 7, border: 'none', cursor: on ? 'default' : 'pointer', background: on ? 'var(--accent)' : 'transparent', color: on ? '#fff' : 'var(--muted)', font: '600 11px var(--font-sans)', whiteSpace: 'nowrap' }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// The room's files panel: everything that crossed this chat, nothing else.
// The whole row is the primary open action. Amber is reserved for an item that
// is still in the waiting-review queue; ordinary files keep a quiet chevron.
export function FilesShelf({ fromAgent = [], youSent = [], onReview, onLocate, needsReview, status, windowFull = false, compact = false }) {
  const CAP = 80; // newest per section; a busy room can carry hundreds
  const [prefs, setPrefs] = useState(readFilesPrefs);
  const setPref = (patch) => setPrefs((prev) => {
    const next = { ...prev, ...patch };
    writeFilesPrefs(next);
    return next;
  });
  const [extraOpen, setExtraOpen] = useState(false);
  const { layout, order, grouped } = prefs;
  const needsAttention = (it) => (typeof needsReview === 'function' ? needsReview(it) : false);
  const openItem = (it) => {
    // A Files card is a preview affordance for every supported type. Prefer the
    // existing in-app viewer for documents as well as media; fall back to the
    // conversation locator only when this mount has no preview handoff.
    if (onReview) { onReview(it); return; }
    if (needsAttention(it) || it.kind === 'photo' || it.kind === 'video') {
      if (it.url) { window.open(it.url, '_blank', 'noopener'); return; }
    }
    onLocate?.(it);
  };
  const row = (it, i) => {
    const waiting = needsAttention(it);
    return (
    <button type="button" key={`${it.url || it.name}-${i}`} onClick={() => openItem(it)}
      aria-label={`${waiting ? 'Review' : onReview ? 'Preview' : 'Find in chat'} ${it.name}`}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 5px', border: 'none', borderBottom: '1px solid var(--divider)', background: 'transparent', textAlign: 'left', fontFamily: 'var(--font-sans)', cursor: 'pointer', borderRadius: 8 }}>
      <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{fileGlyph(it.kind)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{itemMeta(it)}</div>
      </div>
      {waiting ? (
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--warn)', background: 'var(--warn-weak)', border: '1px solid rgba(251,191,36,.3)', padding: '5px 8px', borderRadius: 8, flex: 'none', whiteSpace: 'nowrap' }}>Review</span>
      ) : it.gateStatus === 'fail' ? (
        // Delivered without an independent critic pass. It still arrives — the
        // user judges it — but the card never pretends it was checked. Its own
        // chip, not appended to the meta line: at 340px the meta line ellipsises
        // and "not reviewed" truncated to "not revie…", which is worse than
        // saying nothing. Deliberately neutral, so it never reads as the amber
        // "Review" call to action.
        //
        // The chevron STAYS. This panel exists so the user can open a file that
        // crossed the chat, and the chevron is what says "this row opens". A
        // status note must not cost the row its affordance — dropping it made
        // ungated files look less tappable than their neighbours.
        <>
          {/* One word, tight padding: at 340px the chip plus chevron pushed the
              meta line into truncating mid-unit ("88…", "1.4 M…"), which reads
              as a bug rather than a decision. "Unreviewed" says the same thing
              and buys the size back. */}
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--faint)', background: 'var(--chip)', border: '1px solid var(--divider)', padding: '4px 7px', borderRadius: 7, flex: 'none', whiteSpace: 'nowrap' }}>Unreviewed</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="m9 18 6-6-6-6" /></svg>
        </>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="m9 18 6-6-6-6" /></svg>
      )}
    </button>
    );
  };
  // Grid tile. Images render their real thumbnail; everything else gets its glyph on
  // a tinted plate, because a wall of identical grey rectangles is a worse grid than
  // no grid. Video keeps a glyph rather than a <video> poster: loading N videos to
  // paint N first frames is a lot of bytes for a thumbnail.
  const tile = (it, i) => {
    const waiting = needsAttention(it);
    const isImage = it.kind === 'photo' && !!it.url;
    return (
      <button type="button" key={`${it.url || it.name}-${i}`} onClick={() => openItem(it)}
 aria-label={`${waiting ? 'Review' : onReview ? 'Preview' : 'Open'} ${it.name}`} title={`${it.name}${itemMeta(it) ? `, ${itemMeta(it)}` : ''}`}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 0, border: 'none', background: 'transparent', textAlign: 'left', fontFamily: 'var(--font-sans)', cursor: 'pointer', minWidth: 0 }}>
        <span style={{ position: 'relative', display: 'block', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'var(--media-tile, var(--surface-2))', border: '1px solid var(--divider)' }}>
          {isImage ? (
            <img src={String(it.url).includes('rag.aheadofmarket.com') ? `${it.url}${String(it.url).includes('?') ? '&' : '?'}w=440` : it.url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          ) : (
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(1.7)' }}>{fileGlyph(it.kind)}</span>
          )}
          {waiting ? (
            <span aria-hidden="true" style={{ position: 'absolute', top: 5, right: 5, fontSize: 9.5, fontWeight: 700, color: 'var(--warn)', background: 'rgba(4,6,9,.78)', border: '1px solid rgba(251,191,36,.34)', padding: '2px 6px', borderRadius: 6 }}>Review</span>
          ) : null}
        </span>
        <span style={{ display: 'block', minWidth: 0, fontSize: 11.5, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
        <span className="mono" style={{ display: 'block', marginTop: -3, fontSize: 10, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemMeta(it)}</span>
      </button>
    );
  };
  const body = (list) => (layout === 'grid'
    ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 12 }}>{list.map(tile)}</div>
    : <div style={{ display: 'flex', flexDirection: 'column' }}>{list.map(row)}</div>);
  const section = (label, list) => {
    const shown = list.slice(0, CAP);
    return (
      <div key={label} style={{ marginBottom: 14 }}>
        {label ? <div className="eyebrow" style={{ margin: '2px 4px 6px' }}>{label}</div> : null}
        {body(shown)}
        {list.length > shown.length ? <div className="mono" style={{ fontSize: 10.5, color: 'var(--faint)', padding: '10px 4px' }}>+{list.length - shown.length} more</div> : null}
      </div>
    );
  };
  if (!fromAgent.length && !youSent.length) {
    if (status === 'error') {
 return <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Couldn't load this chat's files right now. They're safe, it retries automatically.</div>;
    }
    return <div style={{ color: 'var(--faint)', fontSize: 12.5 }}>{status === 'loading' ? 'Loading files…' : 'No files have crossed this chat yet.'}</div>;
  }
  // Section label: the single sender's title when one agent speaks here, else the plural.
  const senders = [...new Set(fromAgent.map((i) => i.who).filter(Boolean))];
  const fromLabel = senders.length === 1 ? `From ${senders[0]}` : 'From agents';
  // ONE canonical newest-first ordering, reversed for oldest-first, so the two
  // directions are exact mirrors by construction. Sorting each direction on its own
  // comparator is not enough: a message with several attachments gives its files
  // IDENTICAL timestamps, and tied elements do not come back in opposite orders from
  // two opposite sorts — so the same three files read in the same order under both
  // settings, which looks like the toggle half-worked. Name breaks the tie.
  const canonical = (list) => [...list].sort((a, b) => (tsOf(b) - tsOf(a)) || String(a.name || '').localeCompare(String(b.name || '')));
  const inOrder = (list) => (order === 'oldest' ? canonical(list).reverse() : canonical(list));
  // "All in order" is the chronological view: one timeline across both senders,
  // which is the thing the two grouped sections cannot show.
  const timeline = inOrder([...fromAgent, ...youSent]);
  // On mobile (compact=true): show Order toggle + an icon button that reveals Layout
  // and Grouping inline. Three toggles in a 340px sheet leave no room for anything else.
  const extraControls = (
    <>
      <ShelfToggle label="Layout" value={layout} onChange={(id) => setPref({ layout: id })}
        options={[{ id: 'list', label: 'List' }, { id: 'grid', label: 'Grid' }]} />
      <ShelfToggle label="Grouping" value={grouped ? 'grouped' : 'all'} onChange={(id) => setPref({ grouped: id === 'grouped' })}
        options={[
          { id: 'grouped', label: 'By sender', title: 'Group by who sent it' },
          { id: 'all', label: 'All in order', title: 'One timeline, everything in the order it arrived' },
        ]} />
    </>
  );
  const toolbar = compact ? (
    <div style={{ margin: '0 4px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <ShelfToggle label="Order" value={order} onChange={(id) => setPref({ order: id })}
          options={[{ id: 'newest', label: 'Newest' }, { id: 'oldest', label: 'Oldest' }]} />
        <button type="button" aria-label="More options" aria-expanded={extraOpen ? 'true' : 'false'}
          onClick={() => setExtraOpen((v) => !v)}
          style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--divider)', background: extraOpen ? 'var(--accent)' : 'var(--surface-2)', color: extraOpen ? '#fff' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
      </div>
      {extraOpen ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 7 }}>
          {extraControls}
        </div>
      ) : null}
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', margin: '0 4px 11px' }}>
      <ShelfToggle label="Layout" value={layout} onChange={(id) => setPref({ layout: id })}
        options={[{ id: 'list', label: 'List' }, { id: 'grid', label: 'Grid' }]} />
      <ShelfToggle label="Order" value={order} onChange={(id) => setPref({ order: id })}
        options={[{ id: 'newest', label: 'Newest' }, { id: 'oldest', label: 'Oldest' }]} />
      <ShelfToggle label="Grouping" value={grouped ? 'grouped' : 'all'} onChange={(id) => setPref({ grouped: id === 'grouped' })}
        options={[
          { id: 'grouped', label: 'By sender', title: 'Group by who sent it' },
          { id: 'all', label: 'All in order', title: 'One timeline, everything in the order it arrived' },
        ]} />
    </div>
  );
  return (
    <>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', margin: '0 4px 10px' }}>Everything that crossed this chat. Nothing else.</div>
      {toolbar}
      {windowFull ? (
        <div style={{ background: 'var(--warn-weak, rgba(251,191,36,.08))', border: '1px solid rgba(251,191,36,.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 12, lineHeight: 1.4, color: 'var(--fg)' }}>
          Showing the newest crossings — older files exist. Ask the agent for one by name, or open All files.
        </div>
      ) : null}
      {grouped ? (
        <>
          {fromAgent.length ? section(fromLabel, inOrder(fromAgent)) : null}
          {youSent.length ? section('You sent', inOrder(youSent)) : null}
        </>
      ) : section('', timeline)}
    </>
  );
}

// ── useRoomCrossings — this chat's files, from the conversation itself ────────
// corner:one-corner drop 1 (Patrik's file rule): a file exists for the user only
// if it crossed the conversation. ONE query — the SAME room scoping the thread
// uses (mission_slug | project + project_only | agent) with attachments=1 — so
// the panel can never disagree with the chat: it is the chat, narrowed to files.
// Replaces the old three-source merge (project-files disk walk + list-chat-files
// + message-window scrape), demolished in this block per one-corner doctrine.
// Shared by the desktop Files drawer, the mobile files sheet, and Home's files panel.
function demoRoomCrossings(room) {
  try {
    if (new URLSearchParams(window.location.search).get('demo') !== 'mobile-chat-lifecycle') return null;
    const origin = window.location.origin;
    const ts = new Date().toISOString();
    return [
      { type: 'file', kind: 'photo', name: 'grid-preview.png', url: `${origin}/corner-og.png`, mime: 'image/png', ts, who: 'Renderer', size: 18500, isUser: false, messageId: 'r23-image', gateStatus: '' },
      { type: 'file', kind: 'file', name: 'DESIGN.md', url: `${origin}/cv4-static/DESIGN.md`, mime: 'text/markdown', ts, who: 'Renderer', size: 8200, isUser: false, messageId: 'r23-document', gateStatus: '' },
    ];
  } catch { return null; }
}
export function useRoomCrossings(worldId, room) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [windowFull, setWindowFull] = useState(false);
  useEffect(() => {
    const fixture = demoRoomCrossings(room);
    if (fixture) { setItems(fixture); setWindowFull(false); setStatus('ready'); return undefined; }
    if (!worldId || !room?.id) { setItems([]); setStatus('loading'); return undefined; }
    let alive = true;
    setItems([]);
    setStatus('loading');
    const params = new URLSearchParams();
    params.set('client', worldId);
    if (room.isMission) {
      params.set('mission_slug', String(room.missionSlug || room.id || '').split(':').pop());
      // Project so the reader canonicalizes the bare slug within the right project
      // (Bug 1) — otherwise a correctly-canonicalized mission's crossings are missed.
      if (room.projectSlug) params.set('project', room.projectSlug);
    }
    else if (room.isProject) { params.set('project', room.id); params.set('project_only', '1'); }
    else params.set('agent', room.id);
    params.set('attachments', '1');
    params.set('limit', '2000');
    const load = () => authFetch(`/api/dashboard/supabase-messages?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const rows = Array.isArray(d?.messages) ? d.messages : [];
        const out = [];
        for (const m of rows) {
          const isUser = m.role === 'user' || !!m.user_name;
          const who = isUser ? 'You' : titleForAgent(m.agent || room.name);
          for (const att of rowAttachments(m).attachments) {
            if (!att?.url || !att?.name) continue;
            // gateStatus rides on the attachment (share-file.py stamps it there,
            // not on the parent row) so a file delivered without its critic pass
            // can say so on the card. Patrik 2026-07-27: always deliver, mark it
            // — the gate annotates the work now instead of silently eating it.
            out.push({ type: 'file', kind: fileKind(att.name, att.mime), name: att.name, url: att.url, mime: att.mime || '', ts: m.timestamp || null, who, size: att.size || 0, isUser, messageId: m.id || '', gateStatus: att.gate_status || '' });
          }
        }
        out.sort((a, b) => (new Date(b.ts || 0).getTime() || 0) - (new Date(a.ts || 0).getTime() || 0));
        // Same file announced twice (re-share, retry) → keep the newest card only.
        const seen = new Set();
        const deduped = out.filter((it) => {
          const key = `${it.isUser ? 'u' : 'a'}|${it.url || ''}|${it.name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setItems(deduped);
        setWindowFull(rows.length >= 2000);
        setStatus(deduped.length ? 'ready' : 'empty');
      })
      .catch(() => { if (alive) setStatus((s) => (s === 'ready' ? s : 'error')); });
    load();
    // Progressive polling: 5s for the first 3 polls (a file that takes half a
    // minute to show up reads as a lie), then 30s to ease off once the room is
    // warm. setTimeout recursive so each poll decides the next interval.
    const pollRef = { current: null };
    const pollCountRef = { current: 0 };
    const scheduleNext = () => {
      const delay = pollCountRef.current < 3 ? 5000 : 30000;
      pollRef.current = setTimeout(() => {
        if (!alive) return;
        load();
        pollCountRef.current += 1;
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => { alive = false; if (pollRef.current) clearTimeout(pollRef.current); };
  }, [worldId, room?.id, room?.isMission, room?.isProject, room?.missionSlug]); // eslint-disable-line react-hooks/exhaustive-deps
  const fromAgent = useMemo(() => items.filter((i) => !i.isUser), [items]);
  const youSent = useMemo(() => items.filter((i) => i.isUser), [items]);
  return { fromAgent, youSent, status, windowFull };
}

// A project in the rail is a folder that fans open to its missions. The row itself opens the
// project's general chat; the chevron toggles the mission list; a mission row opens that
// mission's own thread on the right. Mirrors the mobile project screen, here as a tree.
const MISSION_CAP = 8; // a fanned-open project shows this many missions, then "show N more", keeps the rail scannable when a project has dozens.
// missions-tree hands back a NESTED tree (roots carry their sub-missions in `children`).
// Flatten it depth-first into one indented list so missions living in a subfolder
// actually show in the rail — the old code mapped only the roots and dropped every
// nested mission. depth drives the indent so the folder structure stays legible.
function flattenMissions(nodes, depth = 0, out = []) {
  for (const m of (nodes || [])) {
    out.push({ node: m, depth });
    if (Array.isArray(m.children) && m.children.length) flattenMissions(m.children, depth + 1, out);
  }
  return out;
}
function ProjectGroup({ row, selectedProject, selectedMissionSlug, missions, expanded, onToggle, onPickProject, onPickMission, needsCount = 0, needsByMission = {}, titleOverrides = {} }) {
  const flat = flattenMissions(missions);
  const hasMissions = flat.length > 0;
  const [showAll, setShowAll] = useState(false);
  const slugOf = (m) => (String(m.slug || '').includes(':') ? m.slug : `${row.slug}:${m.slug}`);
  const selectedIdx = flat.findIndex(({ node }) => slugOf(node) === selectedMissionSlug);
  // Always show the full list if asked, or if the selected mission sits past the cap (so it stays visible).
  const showEvery = showAll || selectedIdx >= MISSION_CAP;
  const shownMissions = showEvery ? flat : flat.slice(0, MISSION_CAP);
  const hiddenCount = flat.length - shownMissions.length;
  return (
    <div>
      <div className="room" onClick={onPickProject} style={{ cursor: 'pointer', background: selectedProject ? 'var(--accent-weak)' : undefined }}>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label={expanded ? 'Hide missions' : 'Show missions'} aria-expanded={expanded ? 'true' : 'false'}
          style={{ border: 'none', background: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', flex: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><path d="m9 18 6-6-6-6" /></svg>
        </button>
        <svg className={`folder is-${row.tint || 'violet'}`} width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
        <span className="rn" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: selectedProject ? 600 : 500 }}>{row.name}</span>
        <NeedsBadge count={needsCount} />
        {hasMissions && !needsCount ? <span style={{ fontSize: 11, color: 'var(--faint)', flex: 'none' }}>{flat.length}</span> : null}
      </div>
      {expanded ? (
        <div style={{ margin: '2px 0 6px 16px', borderLeft: '1px solid var(--divider)', paddingLeft: 6 }}>
          {hasMissions ? shownMissions.map(({ node: m, depth }) => {
            const missionSlug = slugOf(m);
            const on = selectedMissionSlug === missionSlug;
            return (
              <div key={missionSlug} className="room" onClick={() => onPickMission(m)} style={{ cursor: 'pointer', background: on ? 'var(--accent-weak)' : undefined, paddingTop: 7, paddingBottom: 7, paddingLeft: depth * 14 }}>
                {isActiveRoomStatus(m) ? <span className="sdot is-live" style={{ flex: 'none' }} aria-label="Active" /> : null}
                <span className="rn" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: on ? 600 : 500, color: on ? 'var(--fg)' : 'var(--muted)' }}>{titleOverrides[`m:${missionSlug}`] || missionLabelClean(m.name || m.slug)}</span>
                <NeedsBadge count={needsByMission[missionSlug] || needsByMission[String(missionSlug).split(':').pop()] || 0} />
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

// An older day, folded into a one-line card you tap to open (reuses the .goalcard CSS).
function DesktopDayCard({ group, onSend }) {
  const [open, setOpen] = useState(false);
  const handleReview = (attachment) => { if (onSend) onSend({ type: 'review', attachment }); };
  return (
    <div className={`goalcard${open ? ' is-open' : ''}`}>
      <div className="gc-head" role="button" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen((v) => !v)}>
        <span className="gc-title">{group.label}</span>
        <span className="gc-meta">{group.items.length} message{group.items.length === 1 ? '' : 's'}</span>
        <svg className="gc-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </div>
      <div className="gc-body">
        <div style={{ paddingTop: 8 }}>
          <Cv6MessageThread
            messages={group.items}
            variant="desktop"
            mode="day-folded"
            onAction={onSend}
            onReviewAttachment={handleReview}
            chipsPrimaryFirst={false}
          />
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

function PlainThread({ messages, onSend, localReadOnly = false }) {
  if (!messages?.length) return <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>{localReadOnly ? 'No messages in this room yet. Connect a workspace to send messages.' : 'No messages in this room yet. Start the conversation below.'}</div>;
  const groups = groupByDayD(messages);
  const older = groups.slice(0, -1);
  const latest = groups[groups.length - 1] || null;
  const handleReview = (attachment) => { if (onSend) onSend({ type: 'review', attachment }); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {older.map((g, i) => <DesktopDayCard key={`${g.key}-${i}`} group={g} onSend={onSend} />)}
      {latest && (
        <>
          <div className="daydiv"><span>{latest.label.toUpperCase()}</span></div>
          <Cv6MessageThread
            messages={latest.items}
            variant="desktop"
            mode="latest-day"
            onAction={onSend}
            onReviewAttachment={handleReview}
            chipsPrimaryFirst={false}
          />
        </>
      )}
    </div>
  );
}

export default function ChatDesktop({ worldId, initialRoom, onNav, onOpenNav, onSearch, onReviewFile, onAssignEmail, onOpenRoomColumn, onOpenEmailColumn, onOpenWorkersColumn, windowMode = false, persistSelection = true }) {
  const { data: list } = useChatList();
  const [titleOverrides, setTitleOverrides] = useState({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [headerMoreOpen, setHeaderMoreOpen] = useState(false);
  // Work indicator dropdown — appears in the room header when something is running.
  const [workOpen, setWorkOpen] = useState(false);
  // World-wide in-flight count for the pinned Background work row (M19). room=null
  // deliberately: this badge answers "is anything running anywhere?".
  const { tasks: bgTasks, promises: bgPromises } = useRunningTasks(null);
  const backgroundCount = bgTasks.length + bgPromises.length;
  const roomTitleKey = useCallback((room) => room?.isMission ? `m:${room.missionSlug || room.id}` : room?.isProject ? `p:${room.id}` : `a:${room?.id}`, []);
  // Stable refs so the memoized composer below doesn't re-mount on every list poll.
  const agents = useMemo(() => (list?.agents || []).map((a) => titleOverrides[`a:${a.id}`] ? { ...a, name: titleOverrides[`a:${a.id}`], initials: titleOverrides[`a:${a.id}`].slice(0, 2).toUpperCase(), hasCustomTitle: true } : a), [list, titleOverrides]);
  const projects = useMemo(() => (list?.projects || []).map((p) => titleOverrides[`p:${p.id}`] ? { ...p, name: titleOverrides[`p:${p.id}`] } : p), [list, titleOverrides]);

  // Selected room: the one opened from elsewhere, else the first agent. {id,name,initials,isProject,status}.
  const [picked, setPicked] = useState(initialRoom || null);
  useEffect(() => { setSettingsOpen(false); setHeaderMoreOpen(false); setWorkOpen(false); }, [picked?.id, picked?.missionSlug]);
  // ← chain (Patrik 2026-06-25): from an open thread, ArrowLeft drops back to the chat directory
  // (rail visible, no thread); ArrowLeft again goes Home. 'cleared' forces the directory state.
  const [cleared, setCleared] = useState(false);
  useEffect(() => { setCleared(false); }, [initialRoom?.id]); // a freshly opened room shows its thread
  const selected = useMemo(() => {
    if (cleared) return null;
    if (picked) {
      const live = !picked.isProject && !picked.isMission ? agents.find((a) => a.id === picked.id) : null;
      const base = live ? { ...picked, ...live } : picked;
      const renamed = titleOverrides[roomTitleKey(base)];
      return renamed ? { ...base, name: renamed, initials: renamed.slice(0, 2).toUpperCase(), hasCustomTitle: !base.isProject && !base.isMission ? true : base.hasCustomTitle } : base;
    }
    const a = agents[0];
    return a ? { id: a.id, name: a.name, initials: a.initials, status: a.status, statusText: a.statusLabel, specialistTitle: a.specialistTitle, hasCustomTitle: a.hasCustomTitle } : null;
  }, [cleared, picked, agents, titleOverrides, roomTitleKey]);
  const selectedProjectRecord = useMemo(() => {
    if (!selected?.isProject && !selected?.isMission) return null;
    const slug = selected.isMission ? selected.projectSlug : selected.id;
    return projects.find((project) => project.slug === slug || project.id === slug) || null;
  }, [selected, projects]);
  // Pin the default room (the first agent) into state the moment it's known, so a room-list
  // refetch can never recompute or momentarily drop `selected`. The list refetches very often —
  // realtime agent-status heartbeats fire one every ~2.5s while any agent is working, and the
  // pipe briefly empties agents on a world change — and without this, the default thread's
  // `selected` was rebuilt from `agents[0]` on every refetch. Any reorder or transient empty
  // unmounted + remounted the conversation pane, which flashed the screen (the "blink") and
  // reset the scroll to the top while you were reading. Once pinned, selected===picked is a
  // stable reference immune to that churn. Guarded by `cleared` so ArrowLeft-to-directory sticks.
  useEffect(() => {
    if (picked || cleared) return undefined;
    const a = agents[0];
    if (a) setPicked({ id: a.id, name: a.name, initials: a.initials, status: a.status, statusText: a.statusLabel, specialistTitle: a.specialistTitle, hasCustomTitle: a.hasCustomTitle });
    return undefined;
  }, [picked, cleared, agents]);
  useEffect(() => {
    if (!windowMode || !selected?.name) return;
    document.title = `${selected.name} · Corner chat`;
  }, [windowMode, selected?.name]);
  useEffect(() => {
    if (windowMode) return undefined;
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
  }, [selected, onNav, windowMode]);

  const { messages, archivedMessages, blocks, send, clearRoom, awaiting, awaitingSince, liveSteps, draft, turnHealth, turnState, status: threadStatus, connection, retryTurn, nudgeTurn, repairTurn, stopTurn, stopAvailable, reload: reloadThread } = useRoomThread(worldId, selected);
  // The room agent's own steps — the half of "background work" the old card could not see.
  const roomGoal = useGoalThread(worldId, selected);
  // Per-room running tasks — used by the work-indicator icon to know if anything is active.
  const { tasks: roomTasks, promises: roomPromises } = useRunningTasks(selected);
  const hasRoomWork = !!(selected && (
    awaiting ||
    roomTasks.length > 0 ||
    roomPromises.length > 0 ||
    (roomGoal?.checklist || []).some((s) => s.state === 'active')
  ));
  const lastActiveLabel = (() => {
    const m = messages?.[messages.length - 1];
    if (!m?.ts) return null;
    const d = new Date(m.ts);
    const diffMs = Date.now() - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  })();
  const goal = useGoalThread(worldId, selected);
  // The conversation thread (PlainThread) always renders; while `awaiting`, the agent's LIVE
  // step thread builds right below the just-sent message (WorkingTurn), and each finished turn
  // shows its step thread inline (AgentBlocks). The thread is the conversation (Patrik 2026-06-29).
  // The live thread's header reads "Goal: <your ask>" — prefer the room goal, else the last
  // user message (mirrors ChatLifecycle's threadGoal).
  const askGoal = useMemo(() => {
    if (goal && goal.title) return goal;
    let ask = '';
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      if (messages[i]?.isUser && messages[i].text) { ask = messages[i].text; break; }
    }
    return ask ? { ...(goal || {}), title: ask } : goal;
  }, [goal, messages]);
  const currentAskTitle = useMemo(() => {
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      if (messages[i]?.isUser && messages[i].text) return messages[i].text;
    }
    return goal?.title || '';
  }, [goal?.title, messages]);

  // A "Review"/"Review all" tap on a message attachment must OPEN the Review tool on
  // those exact files (live), not post a chat message. handleReview hands us a single
  // file or an array; everything else (Result block actions, text) flows to send.
  const reviewProject = selected?.projectSlug || (selected?.isProject ? selected.id : '');
  // Bare mission slug rides with every review so the decision routes back to the
  // MISSION thread the user is watching (xhigh review finding 3).
  const reviewMission = selected?.isMission ? String(selected.missionSlug || selected.id || '').split(':').pop() : '';
  const handleThreadAction = useCallback((a) => {
    if (a && typeof a === 'object' && a.type === 'review') {
      const att = a.attachment;
      const files = Array.isArray(att) ? att : (att ? [att] : null);
      if (files && files.length) onReviewFile?.(files, reviewProject, reviewMission);
      return undefined;
    }
    return send?.(a);
  }, [send, onReviewFile, reviewProject, reviewMission]);

  // Right column: Goals view (the agent's goal/steps) or Files view (this conversation's files + links).
 const [drawerView, setDrawerView] = useState('files'); // Files default, Patrik's must-have order put files third and goals nowhere (plan item 23)

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
  const handoffAgent = () => sendControl('Please hand this off to another agent. Tell me who you are handing it to and why.', 'Asked for a hand off.');
  const promoteToMission = () => sendControl(
    'I am explicitly asking to promote this work into a mission. First match it to one of my existing visible projects and tell me which one. If the destination is ambiguous, ask me before creating anything. Only create a new project with my explicit confirmation. Propose a short outcome-based mission name (3-6 words) before scaffolding it, then keep its BUILD, CONTEXT, and last-conversation records synchronized and reply here with a user-visible link to the mission and its deliverables.',
    'Asked the specialist to propose a mission destination and name.',
  );
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
  // This chat's files: the conversation's crossings, nothing else (drop 1).
  // Shared with the mobile files sheet so both read the identical panel.
  const crossings = useRoomCrossings(worldId, selected);
  // Host node the rich CV4 composer (ThreadInputBar: command menu / voice / image
  // gen) portals into. Cv6FullComposer is mounted ONCE at the end of the tree and
  // kept alive; it only paints when a room is open + this host exists, so a thread
  // poll re-render never remounts it. Restored 2026-06-26 once `selected` + `send`
  // became referentially stable across polls (the churn that stole focus before).
  const [composerHost, setComposerHost] = useState(null);
  // Pin to the latest message: after the thread loads (messages arrive async) and whenever a
  // new one lands, so opening a room lands at the tail and your just-sent message isn't hidden
  // below the fold. Reading history (scrolled up) is left alone.
  // Live-step signature: steps change the tail without changing the message
  // count; this key tells the follow effect a real update happened.
  const liveProgressKey = useMemo(() => (liveSteps || []).map((step) => [
    step?.id,
    step?.step_index,
    step?.text,
    step?.timestamp,
    step?.progress,
    step?.state,
  ].join(':')).join('|'), [liveSteps]);
  // THE one stick-to-bottom (Round G): shared with ChatLifecycle via the hook.
  // Desktop gains the jump-to-latest pill; contentKey follows the streaming
  // draft's growth (Round D).
  const { scrollRef, bottomRef, onScroll, showJump, jumpToLatest } = useStickToBottom({
    roomKey: selKey,
    itemsLength: messages?.length || 0,
    awaiting,
    liveKey: liveProgressKey,
    contentKey: draft?.text?.length || 0,
  });

  const pickAgent = (a) => { const room = { id: a.id, name: a.name, initials: a.initials, status: a.status, statusText: a.statusLabel, specialistTitle: a.specialistTitle, hasCustomTitle: a.hasCustomTitle }; if (onOpenRoomColumn) onOpenRoomColumn(room, worldId); else setPicked(room); };
  const pickProject = (p) => { const room = { id: p.slug || p.id, slug: p.slug, name: p.name, initials: (p.name || '?').slice(0, 2).toUpperCase(), isProject: true, status: p.status, statusText: 'project chat' }; if (onOpenRoomColumn) onOpenRoomColumn(room, worldId); else setPicked(room); };
  // DEF-14 guard: m.slug may be JS undefined when a mission object is partially constructed.
  // String(undefined) = "undefined" which is truthy and passes guards — explicitly reject it.
  const pickMission = (p, m) => { const safeSlug = (m.slug != null && String(m.slug).trim() !== 'undefined' && String(m.slug).trim() !== '') ? m.slug : null; const missionSlug = safeSlug && String(safeSlug).includes(':') ? safeSlug : (safeSlug ? `${p.slug}:${safeSlug}` : null); const nm = titleOverrides[`m:${missionSlug}`] || missionLabelClean(m.name || safeSlug); const room = { id: safeSlug, name: nm, initials: (nm || '?').slice(0, 2).toUpperCase(), isMission: true, missionSlug, projectSlug: p.slug, path: m.path || null, status: missionDot(m.status), statusText: p.name }; if (onOpenRoomColumn) onOpenRoomColumn(room, worldId); else setPicked(room); };

  // Real missions per project (same endpoint the mobile project screen uses). Each project
  // row fans open to these; clicking one opens that mission's own thread.
  const [missionReload, setMissionReload] = useState(0);
  const missionsByProject = useProjectMissions(worldId, missionReload);
  const checklistRoomOptions = useMemo(
    () => buildChecklistRoomOptions(agents, projects, missionsByProject),
    [agents, projects, missionsByProject],
  );
  const onRoomRenamed = useCallback((name, { reset = false } = {}) => {
    if (!selected) return;
    const key = roomTitleKey(selected);
    setTitleOverrides((prev) => reset ? (() => { const next = { ...prev }; delete next[key]; return next; })() : { ...prev, [key]: name });
    setPicked((prev) => prev ? { ...prev, name, initials: name.slice(0, 2).toUpperCase(), hasCustomTitle: !prev.isProject && !prev.isMission ? !reset : prev.hasCustomTitle } : prev);
    if (selected.isMission) setMissionReload((n) => n + 1);
  }, [selected, roomTitleKey]);
  // ── The rail is the switchboard (drop 3) ──────────────────────────────────
  // Email and rooms append page-owned workspace columns; they never replace
  // this conversation or escape into browser windows.
  const [composerOpen, setComposerOpen] = useState(false);

  // ── In-chat composer collapse → FAB (task 24452dfa, 2026-08-07) ──────────
  // Opens on room entry (false = open). After a successful send it collapses
  // to a FAB; tapping the FAB re-opens and focuses the input.
  const [composerCollapsed, setComposerCollapsed] = useState(false);
  const composerCollapseTimerRef = useRef(null);
  // Reset to open whenever the selected room changes.
  useEffect(() => {
    setComposerCollapsed(false);
    clearTimeout(composerCollapseTimerRef.current);
  }, [selected?.id, selected?.missionSlug]);
  // Wrap send so a successful post triggers the collapse (120ms delay lets the
  // optimistic bubble render before the composer exits, so the eye reads "sent").
  const sendAndCollapse = useCallback(async (text, opts) => {
    const { keepComposerOpen = false, ...sendOptions } = opts || {};
    const result = await send(text, sendOptions);
    if (result !== false && !keepComposerOpen) {
      clearTimeout(composerCollapseTimerRef.current);
      composerCollapseTimerRef.current = setTimeout(() => setComposerCollapsed(true), 120);
    }
    return result;
  }, [send]);
  const expandComposer = useCallback(() => {
    setComposerCollapsed(false);
    clearTimeout(composerCollapseTimerRef.current);
    // Focus the input after the CSS transition completes (~220ms).
    setTimeout(() => {
      const box = composerHost?.querySelector('input:not([type="file"]):not([type="hidden"]), textarea');
      if (box) box.focus();
    }, 60);
  }, [composerHost]);
  const { inboxItems = [] } = useDataContext() || {};
  // Files waiting on review are attention too (xhigh review finding 4): the
  // waiting queue, grouped per room, joins the same amber badges the needs-you
  // feed drives — a handed-off deliverable pulls the eye to ITS room.
  const [reviewWaiting, setReviewWaiting] = useState({ byProject: {}, byMission: {}, fileKeys: [] });
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    const load = () => authFetch(`/api/dashboard/review-queue?world=${encodeURIComponent(worldId)}&limit=500`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const byProject = {}; const byMission = {}; const fileKeys = new Set();
        for (const it of (d.items || [])) {
          const proj = it.whoRaw || it.project || '';
          const mission = it.missionRaw || it.mission || '';
          if (mission) byMission[mission] = (byMission[mission] || 0) + 1;
          if (proj) byProject[proj] = (byProject[proj] || 0) + 1;
          for (const key of [it.id, it.path, it.name]) if (key) fileKeys.add(String(key));
        }
        setReviewWaiting({ byProject, byMission, fileKeys: [...fileKeys] });
      })
      .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [worldId]);
  // Mission-level needs ROLL UP to the project row (finding 8): a collapsed
  // project must still show amber when only its missions are waiting.
  const needsByProject = useMemo(() => {
    const m = {};
    for (const it of inboxItems) if (it.project) m[it.project] = (m[it.project] || 0) + 1;
    for (const [k, v] of Object.entries(reviewWaiting.byProject)) if (k) m[k] = (m[k] || 0) + v;
    return m;
  }, [inboxItems, reviewWaiting]);
  const needsByMission = useMemo(() => {
    const m = {};
    for (const it of inboxItems) if (it.missionSlug) m[it.missionSlug] = (m[it.missionSlug] || 0) + 1;
    for (const [k, v] of Object.entries(reviewWaiting.byMission)) if (k) m[k] = (m[k] || 0) + v;
    return m;
  }, [inboxItems, reviewWaiting]);
  const waitingFileKeys = useMemo(() => new Set(reviewWaiting.fileKeys || []), [reviewWaiting.fileKeys]);
  const fileNeedsReview = useCallback((it) => waitingFileKeys.has(String(it?.url || '')) || waitingFileKeys.has(String(it?.name || '')), [waitingFileKeys]);
  const nextReviewFile = useMemo(() => crossings.fromAgent.find(fileNeedsReview) || null, [crossings.fromAgent, fileNeedsReview]);
  const locateCrossing = useCallback((item) => {
    setDrawerView('goals');
    requestAnimationFrame(() => {
      const root = scrollRef.current;
      const anchor = [...(root?.querySelectorAll('[data-message-id]') || [])].find((node) => node.getAttribute('data-message-id') === String(item?.messageId || ''));
      if (!anchor) { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); return; }
      anchor.closest('.goalcard')?.classList.add('is-open');
      const visible = anchor.querySelector('.pb, .pb-me, .cv6-msg-extras') || anchor;
      visible.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);
  // Cold start lands on the last-open room (drop 3): remember every pick; the
  // shell seeds its initial room from this key when the app opens plain.
  // Persist only rooms the user actually PICKED (or arrived in) — `selected`
  // auto-pins the first agent when nothing is chosen, and persisting that
  // overwrote the real last room with a default (xhigh review finding 7).
  useEffect(() => {
    if (!persistSelection || !picked?.id) return;
    try { localStorage.setItem('cv6.lastRoom', JSON.stringify({ room: picked, worldId })); } catch { /* private mode */ }
  }, [picked, worldId, persistSelection]);
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
    <ReviewCtx.Provider value={(file) => { if (file) onReviewFile?.(file, reviewProject, reviewMission); }}>
      <div data-cv6 data-theme="dark" data-chat-window={windowMode ? '1' : undefined} className={`cv6-screen${windowMode ? ' is-chat-window' : ''}`} style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* topbar now mounted once in the shell (SharedNav DesktopNav) */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* rooms rail — the switchboard (drop 3): + New up top, rooms scroll,
              Email pinned OUTSIDE the scroll so it is always one click away. */}
          {!windowMode && <div data-chat-room-rail style={{ width: 220, flex: 'none', borderRight: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ flex: 'none', padding: '14px 12px 10px' }}>
              <button type="button" onClick={() => onNav?.('home')}
                style={{ width: '100%', height: 32, marginBottom: 8, padding: '0 10px', borderRadius: 9, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--muted)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 9.8V20h14V9.8"/></svg>
                All rooms
              </button>
              <button onClick={() => setComposerOpen(true)}
                style={{ width: '100%', height: 36, borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                New
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 12px' }}>
              <div className="eyebrow" style={{ margin: '0 6px 8px' }}>Agents</div>
              <div style={{ marginBottom: 16 }}>
                {agents.length ? agents.map((a) => <RoomRow key={a.id} row={a} worldId={worldId} needsCount={a.needsCount || 0} open={selected?.id === a.id && !selected?.isProject} onClick={() => pickAgent(a)} />)
                  : <div style={{ color: 'var(--faint)', fontSize: 12, padding: '0 6px' }}>No agents yet.</div>}
              </div>
              <div className="eyebrow" style={{ margin: '0 6px 8px' }}>Projects</div>
              {projects.length ? projects.map((p) => (
                <ProjectGroup key={p.id} row={p}
                  selectedProject={selected?.id === p.id && selected?.isProject}
                  selectedMissionSlug={selected?.isMission ? selected.missionSlug : null}
                  missions={missionsByProject[p.slug] || []}
                  needsCount={needsByProject[p.slug] || needsByProject[p.id] || 0}
                  needsByMission={needsByMission}
                  titleOverrides={titleOverrides}
                  expanded={expanded.has(p.slug)}
                  onToggle={() => toggleProject(p.slug)}
                  onPickProject={() => { pickProject(p); toggleProject(p.slug); }}
                  onPickMission={(m) => pickMission(p, m)} />
              ))
                : <div style={{ color: 'var(--faint)', fontSize: 12, padding: '0 6px' }}>No projects yet.</div>}
            </div>
            <div style={{ flex: 'none', borderTop: '1px solid var(--divider)', padding: '8px 12px' }}>
              {/* Background work, pinned like Email (corner:one-corner M19): the one
                  window for running jobs + owed come-backs, instead of a card that
                  followed the user into every chat thread. Count = world-wide items
                  in flight — quiet, muted: in-flight is information, amber stays
                  reserved for "waiting on you". */}
              <div className="room" role="button" onClick={() => onOpenWorkersColumn?.()}
                style={{ cursor: 'pointer' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                <span className="rn" style={{ fontWeight: 600 }}>Background work</span>
                {backgroundCount ? <span style={{ marginLeft: 'auto', fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{backgroundCount}</span> : null}
              </div>
              <div className="room" role="button" onClick={() => onOpenEmailColumn?.()}
                style={{ cursor: 'pointer' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                <span className="rn" style={{ fontWeight: 600 }}>Email</span>
              </div>
            </div>
          </div>}

          {/* The selected conversation remains alive while other rooms and Email
              append beside it as independent workspace columns. position:relative
              hosts the composer FAB when the composer is collapsed. */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {selected ? (
              <>
                <div className="desktop-room-header">
                  <RoomAvatar room={selected} worldId={worldId} size={40} turnState={turnState} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, marginBottom: 2, fontSize: 11.5, color: 'var(--muted)' }}>
                      {windowMode
                        ? <span className="cv6-chat-window-label">Independent chat window</span>
                        : <button type="button" onClick={() => onNav?.('home')} style={{ border: 'none', background: 'transparent', color: 'var(--muted)', padding: 0, font: '600 11.5px var(--font-sans)', cursor: 'pointer' }}>Rooms</button>}
                      {selected.isProject || selected.isMission ? <span aria-hidden="true">/</span> : null}
                      {selected.isMission ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projects.find((p) => p.slug === selected.projectSlug || p.id === selected.projectSlug)?.name || selected.statusText || selected.projectSlug}</span> : null}
                    </div>
                    <div className="desktop-room-title" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</span>
                      {(() => {
                        // TOP-20 #19: single turnState truth drives the presence pill,
                        // not a separate deriveRoomStatus guess and not an isInfra
                        // filter. turnState is the engine's one object; pill and
                        // presence dot read the same field so they can never disagree.
                        // When turnState is still loading (null), derive it once —
                        // never fall back to the server room.status string.
                        const k = turnState ? turnState.status : deriveTurnState({ awaiting, liveSteps, draft, turnHealth, connection }).status;
                        // Defect B fix: no .sd dot here — RoomAvatar's presence dot is
                        // THE single indicator; the pill is text-only.
                        return k !== 'idle'
                          ? <span className={`astat is-${ROOM_STATUS_TONE[k]}`} style={{ flex: 'none' }}>{ROOM_STATUS_LABEL[k].toUpperCase()}</span>
                          : null;
                      })()}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selected.hasCustomTitle && selected.specialistTitle ? `${selected.specialistTitle} specialist` : (goal?.title ? <>Goal: {goal.title}</> : (selected.statusText || 'conversation'))}</div>
                  </div>
                  {hasRoomWork ? (
                    <button
                      type="button"
                      className="cv6-chat-header-button"
                      aria-label="Activity"
                      title="Activity"
                      aria-expanded={workOpen ? 'true' : 'false'}
                      onClick={() => { setHeaderMoreOpen(false); setWorkOpen((o) => !o); }}
                      style={{ position: 'relative' }}
                    >
                      {/* Checklist icon */}
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                      </svg>
                      {/* Animated dot — spins while work is in flight */}
                      <span aria-hidden="true" className="cv6-worklist-spin" style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--accent)', borderTopColor: 'transparent', display: 'block' }} />
                    </button>
                  ) : null}
                  <button type="button" className="cv6-chat-header-button" aria-label="Files" title="Files" onClick={() => { setHeaderMoreOpen(false); setWorkOpen(false); setDrawerView('files'); }}>
                    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
                  </button>
                  <button type="button" className="cv6-chat-header-button" aria-label="More" title="More" aria-expanded={headerMoreOpen ? 'true' : 'false'} onClick={() => { setWorkOpen(false); setHeaderMoreOpen((open) => !open); }}>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
                  </button>
                  {headerMoreOpen ? (
                    <>
                      <button type="button" className="cv6-chat-more-scrim" aria-label="Close More menu" onClick={() => setHeaderMoreOpen(false)} />
                      <div className="cv6-chat-more-menu" role="menu" aria-label={`More for ${selected.name}`}>
                        <button type="button" role="menuitem" onClick={() => { setHeaderMoreOpen(false); onSearch?.(); }}>Search conversation</button>
                        <button type="button" role="menuitem" data-testid="room-settings-trigger" onClick={() => { setHeaderMoreOpen(false); setSettingsOpen(true); }}>Room settings</button>
                        <button type="button" role="menuitem" onClick={() => { setHeaderMoreOpen(false); toggleFollow(); }}>{following ? 'Mute updates' : 'Follow along'}</button>
                      </div>
                    </>
                  ) : null}
                  {workOpen ? (
                    <>
                      <button type="button" className="cv6-chat-more-scrim" aria-label="Close activity panel" onClick={() => setWorkOpen(false)} />
                      <div className="cv6-work-dropdown" role="region" aria-label="Active work">
                        <RoomWorkList room={selected} goal={roomGoal} awaiting={awaiting} awaitingSince={awaitingSince} liveSteps={liveSteps} currentAsk={currentAskTitle} expandable />
                      </div>
                    </>
                  ) : null}
                </div>
                {ROOM_STATUS_TONE[turnState?.status] === 'live' ? (
                  <div className="cv6-header-progress" aria-hidden="true"><i /></div>
                ) : null}
                <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: composerCollapsed ? '22px 24px 88px' : '22px 24px' }}>
                  {/* Readable column cap so a wide screen (iPad landscape, big desktop) keeps
                      the thread + its tables/charts centered instead of stretched. Set to 660px
                      to match the kit design (templates/chat.html) and reflow to full width on mobile. */}
                  <div style={{ maxWidth: 660, margin: '0 auto', width: '100%' }}>
                    {/* The thread is the conversation (Patrik 2026-06-29): messages stream in as
                        they land and finished structured turns stay inline. Current work uses the
                        fixed-height progress card below, so steps change in place at the tail. */}
                    {/* A thread that never loaded is not an empty room. The honest error
                        state has existed in the CV6 templates since the rebuild and no live
                        surface rendered it — so a network-dead room read as brand new
                        ("start the conversation"). It renders now, with a retry. */}
                    {threadStatus === 'error' && !messages?.length
                      ? <RoomThreadError onRetry={reloadThread} />
                      : <PlainThread messages={messages} onSend={handleThreadAction} localReadOnly={!supabase} />}
                    {/* Background work came BACK to the thread (Patrik 2026-08-06). Sending it
                        to a separate window meant a busy room looked idle, and only ever showed
                        dispatched sub-agent jobs. This lists both kinds, per room, short, with a
                        live counter on each. The Background work window still exists for the
                        world-wide view. */}
                    <StreamingDraft room={selected} draft={draft} />
                    <RoomWorkList room={selected} goal={roomGoal} awaiting={awaiting} awaitingSince={awaitingSince} liveSteps={liveSteps} turnHealth={turnHealth} currentAsk={currentAskTitle} onStop={stopAvailable ? stopTurn : null} />
                    <RoomRecoveryNotice health={turnHealth} onRetry={retryTurn} onNudge={nudgeTurn} onRestart={repairTurn} />
                    {/* The full-thread error above already says the connection dropped;
                        don't stack a second strip under it saying the same thing. */}
                    <RoomConnectionNotice connection={(threadStatus === 'error' && !messages?.length) ? null : connection} onRetry={reloadThread} />
                    {/* Only renders when the FRONT DOOR chose this room automatically — names
                        the destination the user never got to see, and moves the message in one
                        tap if it guessed wrong (corner:front-door R8). */}
                    <RoutedHereBar
                      room={selected}
                      worldId={worldId}
                      projects={projects}
                      missionsByProject={missionsByProject}
                      onOpenRoom={(r) => { if (onOpenRoomColumn) onOpenRoomColumn(r, worldId); else setPicked(r); }}
                    />
                    <div ref={bottomRef} style={{ height: 4 }} />
                  </div>
                </div>
                {/* Round G: desktop gains the jump-to-latest pill (same kit class as mobile). */}
                {showJump ? (
                  <button className="jumplive" onClick={jumpToLatest}>
                    Jump to latest
                  </button>
                ) : null}
                {/* Rich CV4 composer host — wrapped in a collapsible container.
                    The wrapper animates shut on send (slides+fades down, 220ms).
                    A collapse handle lets Patrik minimize manually at any time.
                    The FAB (rendered below as a sibling) re-expands on tap. */}
                <div className={`cv6-composer-wrap${composerCollapsed ? ' is-collapsed' : ''}`}>
                  {/* Collapse button — sits on the border line, top-right, 28×22px target */}
                  <div style={{ borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', padding: '3px 16px 0' }}>
                    <button
                      type="button"
                      className="cv6-composer-collapse-btn"
                      onClick={() => setComposerCollapsed(true)}
                      aria-label="Collapse composer"
                      title="Collapse"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6 6 6-6" /></svg>
                    </button>
                  </div>
                  <div ref={setComposerHost} style={{ padding: '6px 24px 12px' }} />
                </div>
                {/* FAB — appears bottom-right when the composer is collapsed. Springs in
                    via CSS (scale 0.5→1, cubic-bezier spring) so the motion reads as
                    "it went there." Tap reopens + focuses the input. */}
                <button
                  type="button"
                  className={`cv6-chat-fab${composerCollapsed ? ' is-visible' : ''}`}
                  onClick={expandComposer}
 aria-label="Open composer, type a message"
                  title="Type a message"
                >
                  {/* Pen / compose icon */}
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Pick a room on the left to open its thread.</div>
            )}
          </div>

          {/* control drawer */}
          <div className="cv6-chat-drawer" style={{ width: 316, flex: 'none', borderLeft: '1px solid var(--divider)', padding: 20, overflowY: 'auto' }}>
            {selected ? (
              <>
                {/* Goals | Files toggle — choose what this column shows. */}
                <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--surface-2)', border: '1px solid var(--hair)', borderRadius: 11, marginBottom: 16 }}>
                  {[['goals', 'Goals'], ['files', 'Files']].map(([k, label]) => (
                    <button key={k} role="tab" aria-selected={drawerView === k ? 'true' : 'false'} onClick={() => setDrawerView(k)} style={{ flex: 1, height: 30, borderRadius: 8, border: 'none', cursor: drawerView === k ? 'default' : 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', background: drawerView === k ? 'var(--accent)' : 'transparent', color: drawerView === k ? '#fff' : 'var(--muted)' }}>{label}</button>
                  ))}
                </div>
                {drawerView === 'files' ? (
                  <FilesShelf fromAgent={crossings.fromAgent} youSent={crossings.youSent} status={crossings.status} windowFull={crossings.windowFull} needsReview={fileNeedsReview} onReview={(it) => onReviewFile?.(it, reviewProject, reviewMission)} onLocate={locateCrossing} />
                ) : (
                <>
                {/* 1. Who/what is selected. A project room has no single agent, so label it as the room, not "Agent on this goal". */}
                <div className="eyebrow" style={{ color: 'var(--muted)', marginBottom: 10 }}>{selected.isMission ? 'Mission' : selected.isProject ? 'Project room' : 'Agent on this goal'}</div>
                <div style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: 14, padding: 14, marginBottom: 20, position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RoomAvatar room={selected} worldId={worldId} size={34} turnState={turnState} />
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
                          { label: 'Room settings', onClick: () => { setSettingsOpen(true); setAgentMenuOpen(false); } },
                          ...(nextReviewFile ? [{ label: 'Review next waiting file', onClick: () => { onReviewFile?.(nextReviewFile, reviewProject, reviewMission); setAgentMenuOpen(false); } }] : []),
                          { label: following ? 'Mute updates' : 'Follow along', onClick: () => { toggleFollow(); setAgentMenuOpen(false); } },
                        ].map((mi) => (
                          <button key={mi.label} onClick={mi.onClick} style={{ display: 'flex', alignItems: 'center', height: 36, padding: '0 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--fg)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)', textAlign: 'left', cursor: 'pointer' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            onTouchStart={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                            onTouchEnd={(e) => { e.currentTarget.style.background = 'transparent'; }}>{mi.label}</button>
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

                {/* Quick actions */}
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Quick actions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={onFileChosen} />
                  <button onClick={handoffAgent} disabled={controlBusy} aria-label="Send a hand-off request to another agent" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 11px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 500, cursor: controlBusy ? 'wait' : 'pointer' }} title="Send a hand-off request to another agent">
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7"/></svg>
                    </span>
                    Hand off
                  </button>
                  {!selected.isProject && !selected.isMission ? (
                    <button onClick={promoteToMission} disabled={controlBusy} aria-label="Ask this agent to move the work into a mission" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 11px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 500, cursor: controlBusy ? 'wait' : 'pointer' }} title="Ask this agent to move the work into a project mission structure">
                      <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M12 13h6M15 10v6"/></svg>
                      </span>
                      Promote to mission
                    </button>
                  ) : null}
                  <button onClick={onPickFile} disabled={controlBusy} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 11px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 500, cursor: controlBusy ? 'wait' : 'pointer' }} title="Upload a file into this room">
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </span>
                    {controlBusy ? 'Working…' : 'Add a file'}
                  </button>
                </div>
 {/* Bottom anchor, closes drawer composition so quick actions don't float in a void */}
                {lastActiveLabel ? (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flex: 'none', display: 'inline-block' }} />
                    <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--faint)', letterSpacing: '.04em' }}>Last active {lastActiveLabel}</span>
                  </div>
                ) : null}
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
        roomOptions={checklistRoomOptions}
        quickSend={sendAndCollapse}
        onOpenFiles={() => setDrawerView('files')}
      />
 {/* "+ New", the one shared creation flow (NewComposer), rehomed to the rail. */}
      {composerOpen ? (
        <NewComposer worldId={worldId} projects={projects} agents={agents} initialMode="mission"
          onClose={() => setComposerOpen(false)} onCreated={() => setComposerOpen(false)} />
      ) : null}
      {settingsOpen && selected ? <RoomSettingsDialog
        room={selected}
        worldId={worldId}
        projectId={selectedProjectRecord?.databaseId || selected?.databaseId || ''}
        following={following}
        onToggleFollowing={toggleFollow}
        onClose={() => setSettingsOpen(false)}
        onRenamed={onRoomRenamed}
        onOpenFiles={() => setDrawerView('files')}
        archivedMessages={archivedMessages}
        onClearRoom={clearRoom}
      /> : null}
    </ReviewCtx.Provider>
    </SendCtx.Provider>
  );
}