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
import { GoalThreadBody, SendCtx, ReviewCtx, liveStepsToBlocks } from './ChatGoalThread.jsx';
import { Result } from './BlockRenderer.jsx';
import ResultLinkCards from './ResultLinkCard.jsx';
import { useDictation } from './data/useDictation.js';
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx';
import Cv6FullComposer from './Cv6FullComposer.jsx';
import ColumnExpandButton from './ColumnExpandButton.jsx';
import { FilesShelf, useRoomCrossings } from './ChatDesktop.jsx';
import { Cv6MessageThread } from './MessageThread.jsx';
import { supabase } from '../lib/supabase.js';
// The chat file modal renders REAL previews through the same machinery the
// Review/Files viewer uses (R-CHAT-FILE-MODAL): buildDeliverableBody makes the
// stage HTML for any type; the doc hooks hydrate pdf/docx/html shells in place.
import { buildDeliverableBody } from './data/useReview.js';
import { chatFileToReviewTarget } from './data/previewResolve.js';
import { normalizeReviewHandoff } from './data/reviewTargetResolve.js';
import { useDocZoom } from './useDocZoom.jsx';
import { usePdfDocs } from './data/pdfDocView.js';
import { useDocxDocs } from './data/docxDocView.js';
import { useHtmlDocs } from './data/htmlDocView.js';
import RoomSettingsDialog from './RoomSettingsDialog.jsx';
import RoutedHereBar from './RoutedHereBar.jsx';
import RoomWorkList from './RoomWorkList.jsx';
import { useRunningTasks } from './data/useRunningTasks.js';

// Mobile-header avatar tint + live ring keyed to the room's agent status
// (drop-7 redesign: avatar feels present, ring pulses when live/working).
const AV_TINT = {
  live:    { background: 'rgba(52,211,153,.18)', color: 'var(--success)' },
  working: { background: 'rgba(245,176,93,.18)', color: 'var(--accent)' },
  blocked: { background: 'rgba(251,191,36,.18)', color: 'var(--warn)' },
};
const DOT = { live: 'var(--success)', working: 'var(--accent)', blocked: 'var(--warn)' };
const avTint = (s) => AV_TINT[s] || { background: 'var(--surface-2)', color: 'var(--muted)' };
const avRing = (s) => (s === 'live' ? 'live' : s === 'working' ? 'working' : 'ready');
const dotColor = (s) => DOT[s] || 'var(--muted)';

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

// Fix 2 — System alert detection.
// Messages from the "Systems" agent (elon) that contain raw technical content —
// JSON blobs, log filenames with timestamps, Python tracebacks — are not meant
// for the chat stream. They should go to a collapsed status strip.
// Conservative heuristic: only catch clear technical dumps, not natural language
// status updates the Systems agent also sends.
const SYS_ALERT_RE = /(\{[\s\S]{0,400}"[^"]+"\s*:)|(^\s*Traceback \(most recent)|(^\s*  File ")|(\d{4}-\d{2}-\d{2}[T_]\d{2}[:-]\d{2}[:-]\d{2}.*\.(log|jsonl|txt))/m;
function isSystemAlertMsg(m) {
  if (m.agentName !== 'Systems') return false;
  const t = String(m.text || '').trim();
  if (!t) return false;
  return SYS_ALERT_RE.test(t);
}

// One collapsed bar that holds all system alert messages for this room.
// Tap to expand; shows plain-language summary (no raw JSON, no log paths).
function SystemAlertStrip({ alerts }) {
  const [open, setOpen] = useState(false);
  if (!alerts || !alerts.length) return null;
  const count = alerts.length;
  return (
    <div style={{ margin: '0 0 10px', borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--warn)', flex: 'none' }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.02em' }}>
          {count} system {count === 1 ? 'log entry' : 'log entries'}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ color: 'var(--faint)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .18s' }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div style={{ borderTop: '1px solid var(--divider)', padding: '8px 13px 10px' }}>
          {alerts.map((m) => (
            <div key={m.id || m.ts} style={{ padding: '4px 0', fontSize: 11.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--muted)', fontWeight: 600, fontFamily: 'var(--font-sans)', marginRight: 6 }}>{m.time}</span>
              {String(m.text || '').slice(0, 400)}{(m.text || '').length > 400 ? '…' : ''}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
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
function Message({ m, onSend }) {
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
          {m.isUser
            ? <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</div>
            : <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg)', wordBreak: 'break-word' }}><ChatMessageRenderer content={m.text} /></div>}
        </div>
        {clamped && (
          <button className="longmsg-more" onClick={() => setOpen((v) => !v)}>{open ? 'Show less' : 'Show more'}</button>
        )}
        {m.blocks?.length ? (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {m.blocks.map((b, i) => (
              <Result key={i} block={b} onAction={onSend} />
            ))}
          </div>
        ) : null}
        {/* Completed web work: the shipped link as a tappable card (Patrik 2026-07-13). */}
        {!m.isUser && m.linkCards?.length ? <ResultLinkCards cards={m.linkCards} /> : null}
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
// File Collection (design drop 7, agent-chat/collection.html): a batch of files an agent
// sends folds to ONE card — a preview grid for images, a compact list for docs — with a
// count and "Review all". Tapping any opens the look-only viewer below. Real files only.
function FileGallery({ files, sender, onOpen, onReview }) {
  // A lone video an agent sends reads as a VIDEO, not a grey "Documents" card:
  // it plays INLINE in the bubble (tap play / scrub / fullscreen) so it visibly
  // opens in place, and a one-tap "Comment on frames" jumps to the Review viewer
  // where the scrub bar + pin a frame + comment live. (Before: a lone video fell
  // into the docs list — allDocs === true — so it looked un-openable and the path
  // to frame-commenting was buried. Patrik 2026-07-23.)
  const onlyFile = files.length === 1 ? files[0] : null;
  const loneVideoUrl = onlyFile && fileKind(onlyFile.fileName, onlyFile.fileMime) === 'video'
    ? (onlyFile.attachmentUrl || onlyFile.url || '') : '';
  if (onlyFile && loneVideoUrl) {
    return (
      <div className="turn" style={{ marginBottom: 14 }}>
        <div className="tav" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>{sender?.agentInitials || '·'}</div>
        <div className="tbody">
          <div className="tname"><b>{sender?.agentName || 'Files'}</b><span className="tt">sent a video</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
            <video src={loneVideoUrl} controls playsInline preload="metadata"
              style={{ maxWidth: '100%', maxHeight: 440, width: 'auto', height: 'auto', alignSelf: 'flex-start', borderRadius: 12, background: '#000' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="fc-rev" onClick={() => onReview([onlyFile])}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>
                Comment on frames
              </button>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{onlyFile.fileName || 'video'}{onlyFile.fileSize ? ` · ${fmtSize(onlyFile.fileSize)}` : ''}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const images = files.filter((f) => fileKind(f.fileName, f.fileMime) === 'image');
  const allDocs = images.length === 0;
  const totalSize = files.reduce((s, f) => s + (f.fileSize || 0), 0);
  const noun = allDocs ? 'document' : (images.length === files.length ? 'image' : 'file');
  const title = allDocs ? 'Documents' : (images.length === files.length ? 'Images' : 'Files');
  const meta = `${files.length} ${noun}${files.length === 1 ? '' : 's'}${totalSize ? ` · ${fmtSize(totalSize)}` : ''}`;
  const gridShown = files.slice(0, 8);
  const gridOverflow = files.length - gridShown.length;
  const listShown = files.slice(0, 3);
  const listOverflow = files.length - listShown.length;
  const overflow = allDocs ? listOverflow : gridOverflow;
  return (
    <div className="turn" style={{ marginBottom: 14 }}>
      <div className="tav" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>{sender?.agentInitials || '·'}</div>
      <div className="tbody">
        <div className="tname"><b>{sender?.agentName || 'Files'}</b><span className="tt">sent {files.length} file{files.length === 1 ? '' : 's'}</span></div>
        <div className="filecoll">
          <div className="fc-head">
            <span className="fc-ic"><FileGlyph kind={allDocs ? 'doc' : 'image'} size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fc-t">{title}</div>
              <div className="fc-s">{meta}</div>
            </div>
          </div>
          {allDocs ? (
            <div className="fc-list">
              {listShown.map((f, i) => (
                <div key={i} className="fc-lrow" onClick={() => onOpen(files, i)} role="button">
                  <span className="lg"><FileGlyph kind={fileKind(f.fileName, f.fileMime)} size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.fileName || 'file'}</div></div>
                  {f.fileSize ? <span className="mono" style={{ fontSize: 10, color: 'var(--faint)' }}>{fmtSize(f.fileSize)}</span> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="fc-grid">
              {gridShown.map((f, i) => {
                const kind = fileKind(f.fileName, f.fileMime);
                const isImg = kind === 'image' && f.attachmentUrl;
                const showMore = gridOverflow > 0 && i === gridShown.length - 1;
                return (
                  <div key={i} className={`fc-tile${kind !== 'image' ? ' is-doc' : ''}`} onClick={() => onOpen(files, i)} role="button">
                    {isImg ? <img src={f.attachmentUrl} alt={f.fileName} /> : <FileGlyph kind={kind} size={18} />}
                    {showMore && <div className="more">+{gridOverflow}</div>}
                  </div>
                );
              })}
            </div>
          )}
          <div className="fc-foot">
            <span style={{ flex: 1, fontSize: 11.5, color: 'var(--muted)' }}>{overflow > 0 ? `+${overflow} more` : 'Tap any to preview'}</span>
            <button className="fc-rev" onClick={() => onReview(files)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
              Review all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// The chat file viewer: a real reading surface (R-CHAT-FILE-MODAL, Patrik
// 2026-07-18: "brings up a small modal but never loads the preview"). The stage
// HTML comes from buildDeliverableBody — the SAME renderer Review/Files uses —
// so every type actually renders: image/video/audio stream, pdf/docx/html
// hydrate via the doc hooks below, md/txt/code read inline. Flip through the
// collection with the arrows; "Comment in Review" hands off to the Review tool
// where pins + comments live.
function FileCollectionViewer({ files, startIndex = 0, onClose, onReview }) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(startIndex, files.length - 1)));
  const f = files[idx] || files[0];
  const kind = fileKind(f.fileName, f.fileMime);
  const go = useCallback((d) => setIdx((i) => (i + d + files.length) % files.length), [files.length]);
  const stageRef = useRef(null);
  const cardRef = useRef(null);
  // Pinch/wheel zoom on the open file, and a swipe to walk the rest of the files
  // that came in with it — the same two gestures the Review viewer has, so a file
  // behaves the same whether you opened it from the conversation or from Review.
  const { zoomControls } = useDocZoom({
    wrapRef: cardRef,
    fileKey: idx, // stepping to another file in the collection starts at 1x
    onSwipe: (dir) => { if (files.length > 1) go(dir === 'next' ? 1 : -1); },
  });
  const [body, setBody] = useState(null); // null = loading; { html, type } when built
  // Hydrate any pdf/docx/html shells the injected body carries.
  usePdfDocs(stageRef);
  useDocxDocs(stageRef);
  useHtmlDocs(stageRef);
  const fileSig = `${f?.attachmentUrl || f?.url || ''}|${f?.fileName || f?.name || ''}`;
  useEffect(() => {
    let alive = true;
    setBody(null);
    const target = chatFileToReviewTarget(f);
    if (!target) {
      // Announcement-only file post (no URL anywhere): honest empty state; the
      // Review hand-off below still reaches the queue's copy of the file.
      setBody({ html: '<div style="padding:22px 4px;font-size:13px;line-height:1.5;">This file did not include a readable address. Open it from the Review tab instead.</div>', type: 'copy' });
      return undefined;
    }
    buildDeliverableBody({ id: target.path, title: target.title, type: target.type })
      .then((html) => { if (alive) setBody({ html: html || '', type: target.type }); })
      .catch(() => { if (alive) setBody({ html: '<div style="padding:22px 4px;font-size:13px;">This file could not be loaded right now.</div>', type: 'copy' }); });
    return () => { alive = false; };
  }, [fileSig]); // eslint-disable-line react-hooks/exhaustive-deps
  // The chat modal has no Review pin layer or scrub bar: injected video gets
  // native controls, and the inert pin-shield chrome is dropped.
  useEffect(() => {
    const wrap = stageRef.current;
    if (!wrap || body == null) return;
    wrap.querySelectorAll('video').forEach((v) => { v.controls = true; });
    wrap.querySelectorAll('.pinshield,.pinmode-toggle').forEach((n) => n.remove());
  }, [body]);
  return (
    // data-swipe-guard: this modal owns left/right now (previous/next file). Without
    // it useChatSwipe would fire too and navigate the whole app to another chat
    // out from under the open file.
    <div className="fcviewer" data-swipe-guard="" onClick={onClose}>
      <div ref={cardRef} className="fcviewer-card" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        {zoomControls}
        <div className="fcv-top">
          <div className="mback" style={{ width: 32, height: 32 }} onClick={onClose} role="button" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.fileName || f.name || 'file'}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{kind}{f.fileSize ? ` · ${fmtSize(f.fileSize)}` : ''}</div>
          </div>
        </div>
        {/* The reading stage. The injected body rides the .doc paper (same reading
            surface as Review/Files): light paper + dark ink for documents/text,
            transparent for media so images/video sit directly on the ground.
            Prev/next moved to the footer — floating arrows sat ON the copy. */}
        <div ref={stageRef} className="fcv-stage is-read" data-testid="chat-file-preview" data-preview-state={body == null ? 'loading' : 'ready'}>
          {body == null
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '22px 4px', color: 'var(--muted)', fontSize: 13 }}>Loading preview…</div>
            : <div className={`doc is-${body.type}`} dangerouslySetInnerHTML={{ __html: body.html }} />}
        </div>
        <div className="fcv-foot">
          {files.length > 1 ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <button type="button" className="fcv-step" aria-label="Previous file" onClick={() => go(-1)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', minWidth: 38, textAlign: 'center' }}>{idx + 1} / {files.length}</span>
              <button type="button" className="fcv-step" aria-label="Next file" onClick={() => go(1)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg></button>
            </span>
          ) : (
            <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>Reading view.</span>
          )}
          <span style={{ flex: 1 }} />
          <button className="fc-rev" onClick={() => onReview([f])}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>
            Comment in Review
          </button>
        </div>
      </div>
    </div>
  );
}
// An agent turn that IS a live Goal Thread (the structured step thread), rendered inline
// as that turn so the conversation history stays above it. The header (avatar + title +
// time) matches a normal turn; the body is the real step thread from the agent's blocks.
function GoalTurn({ m, goal, blocks }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <Avatar m={m} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{m.agentName}</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{m.time}</span>
        </div>
        <GoalThreadBody goal={goal} blocks={blocks || m.blocks} header={false} />
        {/* A completion message renders as a goal-thread note (injectWorkSteps), so its
            shipped-link card must ride HERE too — Message's card never runs for it. */}
        {!m.isUser && m.linkCards?.length ? <ResultLinkCards cards={m.linkCards} /> : null}
      </div>
    </div>
  );
}

// (The old dot-pulse ThinkingTurn was removed 2026-06-27 — every surface now shows the one
// shared progress thread, on iff the agent is working, never a separate typing indicator.)

// Walk a run of messages; collapse consecutive file messages into one gallery, and render
// any structured (Goal Thread) message inline as its step thread.
function renderItems(items, onOpenFile, goal, onReview, onSend) {
  const out = []; let run = [];
  const flush = (key) => { if (run.length) { out.push(<FileGallery key={`g${key}`} files={run} sender={run[0]} onOpen={onOpenFile} onReview={onReview} />); run = []; } };
  items.forEach((m, i) => {
    if (m.isFile) { run.push(m); }
    else if (m.blocks && m.blocks.length) { flush(i); out.push(<GoalTurn key={i} m={m} goal={goal} />); }
    else { flush(i); out.push(<Message key={i} m={m} onSend={onSend} />); }
  });
  flush('end');
  return out;
}

// An older day, folded into a one-line card you tap to open.
function DayCard({ group, onOpenFile, goal, onReview, onSend }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`goalcard${open ? ' is-open' : ''}`} style={{ marginBottom: 10 }}>
      <div className="gc-head" onClick={() => setOpen((v) => !v)}>
        <span className="gc-title">{group.label}</span>
        <span className="gc-meta">{group.items.length} message{group.items.length === 1 ? '' : 's'}</span>
        <svg className="gc-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </div>
      <div className="gc-body">
        <Cv6MessageThread
          messages={group.items}
          goal={goal}
          variant="mobile"
          mode="day-folded"
          renderBlocks="goalBody"
          renderAttachments="mobileGallery"
          renderLiveWork="goalBody"
          allowBlocks
          allowAttachments
          allowLinkCards
          allowChips={false}
          onAction={onSend}
          onOpenFile={onOpenFile}
          onReviewFiles={onReview}
          MobileFileGallery={FileGallery}
        />
      </div>
    </div>
  );
}

// ── Files in this room, from chat (Patrik #1, chat-surface WD40 R1) ──────────
// A CV6 bottom sheet over the conversation: the SAME crossings panel the desktop
// Files drawer shows (this chat's files, From agent / You sent — drop 1),
// reachable from the chat header and from the composer's command menu. Mounted
// only while open, so the fetch happens on first open, not on every room visit.
// columnMode=false (mobile): ADD design bottom sheet (task dae1720a, Patrik chose it).
// columnMode=true (desktop column): right-side side panel (Patrik ruling 2026-07-20).

// ── Mobile Files Sheet helpers (ADD design, task dae1720a) ──────────────────
// Type chip label: short extension monogram for each file kind.
// Photos: null — they get a real thumbnail instead.
function mfsExt(name) { return String(name || '').split('.').pop().toLowerCase(); }
function mfsTypeLabel(kind, name) {
  if (kind === 'photo') return null;
  if (kind === 'video') return 'VID';
  if (kind === 'pdf') return 'PDF';
  const ext = mfsExt(name);
  if (ext === 'md' || ext === 'markdown') return 'MD';
  if (ext === 'json') return 'JSON';
  if (ext === 'csv') return 'CSV';
  if (ext === 'xlsx' || ext === 'xls') return 'XLS';
  if (ext === 'doc' || ext === 'docx') return 'DOC';
  if (ext === 'txt') return 'TXT';
  if (ext === 'ts' || ext === 'js' || ext === 'jsx' || ext === 'tsx') return ext.toUpperCase();
  return (ext.slice(0, 4).toUpperCase()) || 'FILE';
}
// Background for type chip. SOLID, not a tint: the approved corner-files-add.png frame
// draws these as full-strength swatches (blue MD, amber JSON) and the shipped build had
// them at 16% alpha, which is most of why Patrik said the screen "looks off from how you
// designed it" (2026-08-07). Unknown types stay neutral so the colour still means something.
function mfsChipBg(kind, name) {
  const ext = mfsExt(name);
  if (kind === 'video') return '#db2777';
  if (kind === 'pdf') return '#f59e0b';
  if (ext === 'json') return '#f59e0b';
  if (ext === 'csv' || ext === 'xlsx' || ext === 'xls' || ext === 'tsv') return '#10b981';
  if (ext === 'md' || ext === 'markdown' || ext === 'doc' || ext === 'docx') return '#2563eb';
  return 'var(--chip)';
}
// Foreground for the monogram. Picked per swatch for contrast, not by hue-matching:
// white clears 4.5:1 on the blue and pink, but only ~2:1 on amber and green, so those
// two carry near-black instead. An 11px bold monogram gets no large-text exemption.
function mfsChipFg(kind, name) {
  const ext = mfsExt(name);
  if (kind === 'video') return '#fff';
  if (kind === 'pdf' || ext === 'json') return '#231a05';
  if (ext === 'csv' || ext === 'xlsx' || ext === 'xls' || ext === 'tsv') return '#04231a';
  if (ext === 'md' || ext === 'markdown' || ext === 'doc' || ext === 'docx') return '#fff';
  return 'var(--muted)';
}
// Save a file to the device for real. The shipped build called window.open(url), which
// opens a tab — Patrik 2026-08-07: "when you hit it, it should actually save something".
// A bare <a download> does nothing cross-origin (files live on rag.aheadofmarket.com, the
// app on lab.aheadofmarket.com), so fetch the bytes and hand the browser a same-origin
// blob. Verified the host sends access-control-allow-origin:*, so the fetch is allowed.
async function mfsSaveFile(f) {
  if (!f?.url) return { ok: false, reason: 'no-url' };
  const filename = f.name || 'file';
  try {
    const res = await fetch(f.url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking immediately can cancel the download on some mobile browsers.
    setTimeout(() => { try { URL.revokeObjectURL(href); } catch (_) { /* noop */ } }, 60000);
    return { ok: true };
  } catch (err) {
    // CORS refused, offline, or the blob path is unavailable: still attempt a direct
    // download rather than silently doing nothing, and report which path was taken.
    try {
      const a = document.createElement('a');
      a.href = f.url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return { ok: true, degraded: true };
    } catch (_) {
      return { ok: false, reason: String(err && err.message ? err.message : err).slice(0, 80) };
    }
  }
}
// Filter classification: doc and data are separate chip types.
function mfsIsData(f) { return ['json','csv','xlsx','xls','tsv'].includes(mfsExt(f.name)); }
function mfsIsDoc(f) { return f.kind !== 'photo' && f.kind !== 'video' && !mfsIsData(f); }
// "New" = arrived in the last 15 minutes — a pragmatic proxy for "this session".
const MFS_NEW_MS = 15 * 60 * 1000;
function mfsIsNew(f) {
  const ts = new Date(f.ts || 0).getTime();
  return ts > 0 && (Date.now() - ts) < MFS_NEW_MS;
}
// Display title for a row. The approved frame reads as a curated list ("Mobile review",
// "Creative brief"), not a directory listing — because the extension is carried by the
// type tile beside the name and never repeated in it. Rendering the raw filename
// ("steffen-verify-390-recheck.png") is most of why the live screen looked wrong.
// The true filename is never lost: it stays in the row's aria-label + title, the ⋮ menu
// header, and the saved file on disk.
function mfsDisplayName(name) {
  const raw = String(name || '').trim();
  if (!raw) return 'Untitled';
  // Drop the extension only when it looks like one (short, alphanumeric) so a name
  // such as "v1.2 pricing" keeps its dot.
  const base = raw.replace(/\.[A-Za-z0-9]{1,5}$/, '') || raw;
  const words = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!words) return raw;
  return words.charAt(0).toUpperCase() + words.slice(1);
}
// Thumbnail source for a 40px tile. The file host will hand back a downscaled WebP for
// `?w=`, which is the difference between a 2.5MB screenshot and ~5KB per tile — a Files
// panel used to pull tens of megabytes to paint a grid of 40px squares, and the tiles
// sat empty for ~10s (Patrik 2026-08-07: "images do open very slow"). Only rag-hosted
// files get the param; anything else is left exactly as-is. If the host does not
// understand it the param is ignored and the original comes back, so this cannot break
// a tile — it can only fail to speed one up.
function mfsThumbSrc(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('rag.aheadofmarket.com')) return url;
  // 40 CSS px at up to 3x DPR = 120 device px.
  return url + (url.includes('?') ? '&' : '?') + 'w=120';
}
// "who — Xm — 12 KB" formatted meta line.
function mfsRelAgo(ts) {
  if (!ts) return '';
  const ms = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now'; if (m < 60) return `${m}m`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
function mfsHumanSize(bytes) {
  const b = Number(bytes) || 0; if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
function mfsMeta(f) {
  return [f.who, mfsRelAgo(f.ts), mfsHumanSize(f.size)].filter(Boolean).join(' — ');
}

// ── SwipeFileRow — touch gesture: left-swipe reveals 80px Save panel ────────
// Direction convention matches commit 27c68aaf: dx < 0 (finger moves left)
// reveals content on the RIGHT side of the row. No conflict with page navigation
// swipe because this component lives inside an absolute overlay.
// The row layer SHRINKS from its right edge rather than sliding left. Translating the
// whole layer (the first cut of this) pushed the filename off the left edge of the
// sheet — swiped open, "Steffen verify 390 after r1" read as "effen verify 390 after
// r1", so the one thing you need to see before tapping Save was the thing the gesture
// hid. The approved frame keeps the text anchored and opens space at the card's right
// end; shrinking the width does exactly that, and the name ellipsizes instead of
// running off-screen.
function SwipeFileRow({ id, onSave, openId, setOpenId, children }) {
  const innerRef = useRef(null);
  const startXRef = useRef(null);
  const snappedRef = useRef(false);
  const SAVE_W = 80;
  const THRESHOLD = 48;
  const isOpen = openId === id;

  // `open` = px of Save panel revealed, 0..SAVE_W.
  const setOpenPx = useCallback((px, animate) => {
    const el = innerRef.current;
    if (!el) return;
    el.style.transition = animate ? 'width .2s ease' : 'none';
    el.style.width = `calc(100% - ${px}px)`;
  }, []);

  // Close this row if another row was opened elsewhere.
  useEffect(() => {
    if (openId !== id && snappedRef.current) {
      setOpenPx(0, true);
      snappedRef.current = false;
    }
  }, [openId, id, setOpenPx]);

  const onTouchStart = useCallback((e) => {
    startXRef.current = e.touches[0].clientX;
    setOpenPx(snappedRef.current ? SAVE_W : 0, false);
    // Close any other open row
    if (openId && openId !== id) setOpenId(null);
  }, [openId, id, setOpenId, setOpenPx]);

  const onTouchMove = useCallback((e) => {
    if (startXRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const base = snappedRef.current ? SAVE_W : 0;
    setOpenPx(Math.max(0, Math.min(SAVE_W, base - dx)), false);
  }, [setOpenPx]);

  const onTouchEnd = useCallback((e) => {
    if (startXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - startXRef.current;
    const base = snappedRef.current ? SAVE_W : 0;
    const net = Math.max(0, Math.min(SAVE_W, base - dx));
    if (!snappedRef.current && net > THRESHOLD) {
      setOpenPx(SAVE_W, true);
      snappedRef.current = true;
      setOpenId(id);
    } else if (snappedRef.current && net < SAVE_W - THRESHOLD) {
      setOpenPx(0, true);
      snappedRef.current = false;
      setOpenId(null);
    } else {
      setOpenPx(snappedRef.current ? SAVE_W : 0, true);
    }
    startXRef.current = null;
  }, [id, setOpenId, setOpenPx]);

  const doSave = useCallback(() => {
    onSave?.();
    setOpenPx(0, true);
    snappedRef.current = false;
    setOpenId(null);
  }, [onSave, setOpenId, setOpenPx]);

  return (
    <div className={`cv6-fs-swipe-wrap${isOpen ? ' is-open' : ''}`}>
      {/* Save panel sitting BEHIND the row. It is only ever seen because the row slides
          off it — the row layer is opaque, so at rest this is completely covered.
          aria-hidden while closed keeps a control nobody can see out of the a11y tree;
          the same action is always reachable from the ⋮ menu. */}
      <div className="cv6-fs-save-panel" aria-hidden={isOpen ? undefined : 'true'}>
        <button type="button" className="cv6-fs-save-btn" onClick={doSave} tabIndex={isOpen ? 0 : -1}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V3M8 11l4 4 4-4" /><path d="M4 20h16" />
          </svg>
          Save
        </button>
      </div>
      {/* Translating row content */}
      <div
        ref={innerRef}
        className="cv6-fs-swipe-inner"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// ── MobileFilesContent — filter chips + grouped list (ADD design) ─────────
function MobileFilesContent({ fromAgent, youSent, status, onReview }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [swipeOpenId, setSwipeOpenId] = useState(null);
  const [menuFile, setMenuFile] = useState(null);
  const [toast, setToast] = useState(null);

  // One receipt path for every way a file can be saved (swipe panel or ⋮ menu), so the
  // user always gets told what happened instead of guessing whether the tap registered.
  const saveFile = useCallback(async (f) => {
    setToast({ state: 'saving', name: f?.name || '' });
    const r = await mfsSaveFile(f);
    setToast(r.ok
      ? { state: 'ok', name: f?.name || '', degraded: !!r.degraded }
      : { state: 'err', name: f?.name || '' });
  }, []);

  useEffect(() => {
    if (!toast || toast.state === 'saving') return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Merge + deduplicate + sort newest-first (same logic as FilesShelf canonical()).
  const allFiles = useMemo(() => {
    const merged = [...fromAgent, ...youSent];
    merged.sort((a, b) => (new Date(b.ts || 0).getTime() || 0) - (new Date(a.ts || 0).getTime() || 0));
    const seen = new Set();
    return merged.filter((f) => {
      const key = `${f.url || ''}::${f.name || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [fromAgent, youSent]);

  // Live counts for chip labels.
  const counts = useMemo(() => ({
    all: allFiles.length,
    docs: allFiles.filter(mfsIsDoc).length,
    images: allFiles.filter((f) => f.kind === 'photo').length,
    data: allFiles.filter(mfsIsData).length,
  }), [allFiles]);

  // Filtered list per active chip.
  const filtered = useMemo(() => {
    if (activeFilter === 'docs') return allFiles.filter(mfsIsDoc);
    if (activeFilter === 'images') return allFiles.filter((f) => f.kind === 'photo');
    if (activeFilter === 'data') return allFiles.filter(mfsIsData);
    return allFiles;
  }, [allFiles, activeFilter]);

  // Split into a recent (carded) band and everything older (plain list). That contrast
  // IS the approved frame's hierarchy — so the band has to be reachable in practice.
  // It used to key on local midnight, which made the whole design unreachable: Patrik
  // opened the room at 20:34 with his newest files 17h old (i.e. yesterday's calendar
  // day), every one of the 37 fell to EARLIER, and he saw a flat list with no cards at
  // all — "the design looks off from how you designed it" (2026-08-07). A rolling 24h
  // window keeps "a delivery from last night" in the band where it belongs. The header
  // still tells the truth: TODAY only when the band really is today's calendar date.
  const MFS_RECENT_MS = 24 * 60 * 60 * 1000;
  const { recent, earlier, recentLabel } = useMemo(() => {
    const now = Date.now();
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const r = []; const e = [];
    let allToday = true;
    for (const f of filtered) {
      const ts = new Date(f.ts || 0).getTime();
      if (ts > 0 && now - ts < MFS_RECENT_MS) {
        r.push(f);
        if (ts < midnight.getTime()) allToday = false;
      } else e.push(f);
    }
    return { recent: r, earlier: e, recentLabel: r.length && allToday ? 'TODAY' : 'RECENT' };
  }, [filtered]);

  // Open a file: photos/videos into the review viewer; other files in a new tab.
  const openFile = useCallback((f) => {
    if (f.kind === 'photo' || f.kind === 'video') { onReview?.(f); return; }
    if (f.url) window.open(f.url, '_blank', 'noopener');
  }, [onReview]);

  if (!fromAgent.length && !youSent.length) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--faint)', fontSize: 13, padding: '32px 16px', textAlign: 'center' }}>
        {status === 'loading' ? 'Loading files…' : 'No files have crossed this room yet.'}
      </div>
    );
  }

  const FILTERS = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'docs', label: 'Docs', count: counts.docs },
    { id: 'images', label: 'Images', count: counts.images },
    { id: 'data', label: 'Data', count: counts.data },
  ].filter(({ id, count }) => id === 'all' || count > 0);

  const renderRow = (f, i) => {
    const isImg = f.kind === 'photo' && !!f.url;
    const label = mfsTypeLabel(f.kind, f.name);
    const rowId = `${f.url || f.name}-${i}`;
    const isNew = mfsIsNew(f);
    return (
      <SwipeFileRow key={rowId} id={rowId} onSave={() => saveFile(f)} openId={swipeOpenId} setOpenId={setSwipeOpenId}>
        <button type="button" className="cv6-fs-row" onClick={() => openFile(f)} aria-label={`Open ${f.name}`} title={f.name}>
          {/* Type chip or real thumbnail */}
          <span
            className={`cv6-fs-type${isImg ? ' cv6-fs-type--img' : ''}`}
            style={isImg ? undefined : { background: mfsChipBg(f.kind, f.name), color: mfsChipFg(f.kind, f.name) }}
          >
            {isImg ? (
              <>
                {/* Placeholder visible until image loads */}
                <svg className="cv6-fs-img-ph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l5-5 4 4 3-3 6 6" />
                </svg>
                <img
                  src={mfsThumbSrc(f.url)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="cv6-fs-thumb"
                  onLoad={(e) => {
                    e.currentTarget.classList.add('cv6-fs-thumb--loaded');
                    const p = e.currentTarget.closest('.cv6-fs-type--img');
                    if (p) p.classList.add('cv6-fs-type--thumb-ready');
                  }}
                />
              </>
            ) : (
              <span className="cv6-fs-type-lbl">{label || '?'}</span>
            )}
          </span>
          {/* File name + meta */}
          <div className="cv6-fs-row-body">
            <div className="cv6-fs-row-name">{mfsDisplayName(f.name)}</div>
            <div className="cv6-fs-row-meta">{mfsMeta(f)}</div>
          </div>
          {/* "New" chip for session arrivals */}
          {isNew && <span className="cv6-fs-new-chip" aria-label="New file">New</span>}
        </button>
        {/* Overflow ⋮ — 44pt tap target. Sibling of the row, not a child: a <button>
            may not contain a <button>, and nesting it meant the name column ran
            underneath instead of ending before it. */}
        <button
          type="button"
          className="cv6-fs-overflow"
          aria-label={`More options for ${f.name}`}
          onClick={(e) => { e.stopPropagation(); setMenuFile(f); }}
        >
          <svg width="4" height="16" viewBox="0 0 4 20" fill="currentColor" aria-hidden="true">
            <circle cx="2" cy="2" r="2" /><circle cx="2" cy="10" r="2" /><circle cx="2" cy="18" r="2" />
          </svg>
        </button>
      </SwipeFileRow>
    );
  };

  // `recent` = the carded treatment in the approved frame. Today's arrivals sit in cards;
  // everything older is a plain list. That contrast is the hierarchy Patrik signed off on.
  const renderSection = (label, files, recent) => {
    if (!files.length) return null;
    return (
      <div key={label} className={`cv6-fs-section${recent ? ' cv6-fs-section--recent' : ''}`}>
        <div className="cv6-fs-section-hdr">{label}</div>
        {files.map(renderRow)}
      </div>
    );
  };

  return (
    <>
      {/* Filter chips row */}
      <div className="cv6-fs-filters" role="tablist" aria-label="File type filter">
        {FILTERS.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeFilter === id}
            className={`cv6-fs-fchip${activeFilter === id ? ' cv6-fs-fchip--active' : ''}`}
            onClick={() => setActiveFilter(id)}
          >
            {label}{id !== 'all' ? ` ${count}` : count > 0 ? ` ${count}` : ''}
          </button>
        ))}
      </div>
      {/* Scrollable file list — grouped by date */}
      <div className="cv6-fs-list" role="tabpanel">
        {renderSection(recentLabel, recent, true)}
        {renderSection('EARLIER', earlier, false)}
        {!recent.length && !earlier.length && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>
            No {activeFilter !== 'all' ? activeFilter + ' ' : ''}files yet
          </div>
        )}
      </div>
      {/* ⋮ action sheet */}
      {menuFile && (
        <div className="cv6-fs-menu-scrim" onClick={() => setMenuFile(null)} role="presentation">
          <div className="cv6-fs-menu" onClick={(e) => e.stopPropagation()} role="menu" aria-label={`Actions for ${menuFile.name}`}>
            <div className="cv6-fs-menu-title">{menuFile.name}</div>
            <button type="button" className="cv6-fs-menu-item" role="menuitem"
              onClick={() => { const f = menuFile; setMenuFile(null); openFile(f); }}>Open</button>
            <button type="button" className="cv6-fs-menu-item" role="menuitem"
              onClick={() => { const f = menuFile; setMenuFile(null); saveFile(f); }}>Save to device</button>
            <button type="button" className="cv6-fs-menu-item" role="menuitem"
              onClick={async () => {
                const f = menuFile; setMenuFile(null);
                try {
                  await navigator.clipboard.writeText(f.url || '');
                  setToast({ state: 'ok', name: 'Link copied', copied: true });
                } catch (_) {
                  setToast({ state: 'err', name: 'Link copied', copied: true });
                }
              }}>Copy link</button>
            <button type="button" className="cv6-fs-menu-item" role="menuitem"
              style={{ color: 'var(--muted)' }} onClick={() => setMenuFile(null)}>Cancel</button>
          </div>
        </div>
      )}
      {/* Save receipt — never claim a save happened without showing it did */}
      {toast && (
        <div className={`cv6-fs-toast${toast.state === 'err' ? ' cv6-fs-toast--err' : ''}`} role="status" aria-live="polite">
          {toast.copied
            ? <span>{toast.state === 'ok' ? 'Link copied' : "Couldn't copy the link"}</span>
            : (
              <>
                <span>{toast.state === 'saving' ? 'Saving' : toast.state === 'ok' ? 'Saved' : "Couldn't save"}</span>
                <span className="cv6-fs-toast-name">{toast.name}</span>
              </>
            )}
        </div>
      )}
    </>
  );
}

// ── RoomFilesSheet — wrapper that chooses mobile (ADD) vs desktop (side panel) ─
function RoomFilesSheet({ worldId, room, onClose, onReview, columnMode = false }) {
  const { fromAgent, youSent, status, windowFull } = useRoomCrossings(worldId, room);
  const isMobile = !columnMode;
  const totalCount = fromAgent.length + youSent.length;

  if (!isMobile) {
    // Desktop: unchanged right-side panel with FilesShelf.
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }} />
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 340, maxWidth: '88%',
          background: 'var(--ground)',
          borderTopLeftRadius: 22, borderBottomLeftRadius: 22,
          borderLeft: '1px solid var(--hair)',
          boxShadow: '-22px 0 54px -22px rgba(0,0,0,.65)',
          display: 'flex', flexDirection: 'column',
          padding: '14px 16px max(22px, env(safe-area-inset-bottom, 0px))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flex: 'none' }}>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>Files in this room</span>
            <div className="ib" role="button" aria-label="Close files" tabIndex={0}
              onClick={onClose}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose?.(); } }}
              style={{ width: 32, height: 32, borderRadius: 9, cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <FilesShelf fromAgent={fromAgent} youSent={youSent} status={status} windowFull={windowFull}
              onReview={onReview} onLocate={onReview} compact={false} />
          </div>
        </div>
      </div>
    );
  }

  // Mobile: ADD design — full-width bottom sheet (task dae1720a, Patrik's choice).
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40 }} onClick={onClose}>
      <div
        className="cv6-fs-sheet"
        onClick={(e) => e.stopPropagation()}
        // Horizontal swipes inside this sheet are swipe-to-save. Without this the
        // page-level chat swipe steals them and navigates to the next room instead.
        data-swipe-guard=""
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 3, background: 'var(--divider)', margin: '12px auto 0', flex: 'none' }} />
        {/* Header row: Files + count chip + select icon + close */}
        <div className="cv6-fs-header">
          <div className="cv6-fs-title-row">
            <span className="cv6-fs-title">Files</span>
            {totalCount > 0 && <span className="cv6-fs-count-chip">{totalCount}</span>}
          </div>
          <div className="cv6-fs-header-actions">
            <button type="button" className="cv6-fs-icon-btn" aria-label="Select files" title="Select files">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" /><polyline points="9 12 12 15 16 9" />
              </svg>
            </button>
            <button type="button" className="cv6-fs-icon-btn" aria-label="Close files" title="Close" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {/* Content: filter chips + scrollable file list */}
        <div className="cv6-fs-content">
          <MobileFilesContent
            fromAgent={fromAgent}
            youSent={youSent}
            status={status}
            onReview={onReview}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChatLifecycle({ room, fullRoom, worldId, projectId, roomOptions = [], messages, archivedMessages, status, onBack, onSearch, onRoomRenamed, onClearRoom, onSend, goal, onOpenReview, liveSteps, awaiting: awaitingProp, awaitingSince, columnMode = false, onClose, expanded = false, onToggleWidth }) {
  const [draft, setDraft] = useState('');
  const localReadOnly = !supabase;
  const dictate = useDictation((text) => setDraft((d) => (d ? d.replace(/\s*$/, '') + ' ' : '') + text));
  // Files-from-chat + the rich composer bridge (chat-surface WD40 R1). The rich
  // CV4-functionality/CV6-look composer needs the room's full identity (project /
  // mission / agent scope) + world; without them we keep the plain bar.
  const [filesSheetOpen, setFilesSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  useEffect(() => { setSettingsOpen(false); setMoreOpen(false); setWorkOpen(false); }, [fullRoom?.id, fullRoom?.missionSlug]);
  const [mComposerHost, setMComposerHost] = useState(null);
  const richComposer = !!(fullRoom && worldId);
  const roomKeyForSheet = fullRoom?.id || room?.name;
  // Room switch: close the sheet AND drop any plain-bar draft, so text typed in
  // one room never reappears when the fallback composer mounts in another
  // (fresh-eyes review 2026-07-06, finding 4).
  useEffect(() => { setFilesSheetOpen(false); setDraft(''); }, [roomKeyForSheet]);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const [showJump, setShowJump] = useState(false);

  // Fix 2 — split raw system alert messages out of the thread before grouping.
  // They render in a separate collapsed strip above the conversation, not inline.
  const { threadMessages, systemAlerts } = useMemo(() => {
    const thread = [];
    const alerts = [];
    for (const m of (messages || [])) {
      if (isSystemAlertMsg(m)) alerts.push(m);
      else thread.push(m);
    }
    return { threadMessages: thread, systemAlerts: alerts };
  }, [messages]);
  const groups = useMemo(() => groupByDay(threadMessages), [threadMessages]);
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
  // A standing room goal can outlive several turns. Activity's immediate fallback must
  // name the message the agent just received, not that older umbrella goal.
  const currentAskTitle = useMemo(() => {
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      if (messages[i]?.isUser && messages[i].text) return messages[i].text;
    }
    return goal?.title || '';
  }, [goal?.title, messages]);

  // ── Mobile composer collapse → FAB (task 24452dfa, 2026-08-07) ──────────
  // Composer starts open on room entry; collapses to a FAB after successful send.
  const [composerCollapsed, setComposerCollapsed] = useState(false);
  const composerCollapseTimerRef = useRef(null);
  // Reset to open whenever the room changes.
  useEffect(() => {
    setComposerCollapsed(false);
    clearTimeout(composerCollapseTimerRef.current);
  }, [roomKeyForSheet]);
  // Wrap the incoming onSend so a successful post triggers the collapse.
  const onSendAndCollapse = useCallback(async (text, opts) => {
    const result = await onSend?.(text, opts);
    if (result !== false) {
      clearTimeout(composerCollapseTimerRef.current);
      composerCollapseTimerRef.current = setTimeout(() => setComposerCollapsed(true), 120);
    }
    return result;
  }, [onSend]);

  const submit = async () => {
    const t = draft.trim();
    if (!t || localReadOnly) return;
    const ok = await onSend?.(t);
    if (ok !== false) {
      setDraft('');
      clearTimeout(composerCollapseTimerRef.current);
      composerCollapseTimerRef.current = setTimeout(() => setComposerCollapsed(true), 120);
    }
  };

  // Live work owns one place: the tail of the conversation. Older behavior pinned the
  // user's question near the header and reserved 78vh underneath it. That made the real
  // progress turn look attached to an older message and let it leave the visible bottom.
  const lastMsg = messages?.length ? messages[messages.length - 1] : null;
  // Prefer the hook's hardened working signal (settles on the bridge's end-of-turn marker,
  // shows when you open a busy room) so mobile reads identically to the other surfaces; fall
  // back to the local "last message is mine" guess only when no signal was passed (demo).
  const awaiting = awaitingProp != null ? awaitingProp : (!!lastMsg && lastMsg.isUser);
  // Per-room running tasks + goal-step signal — drives the topbar work indicator.
  const { tasks: roomTasks, promises: roomPromises } = useRunningTasks(fullRoom || room);
  const hasRoomWork = !!(
    awaiting ||
    roomTasks.length > 0 ||
    roomPromises.length > 0 ||
    (goal?.checklist || []).some((s) => s.state === 'active')
  );
  const liveProgressKey = useMemo(() => (liveSteps || []).map((step) => [
    step?.id,
    step?.step_index,
    step?.text,
    step?.timestamp,
    step?.progress,
    step?.state,
  ].join(':')).join('|'), [liveSteps]);

  const followTail = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);
  const jumpToLatest = useCallback(() => followTail('smooth'), [followTail]);

  // The pill shows when scrolled away from the active exchange.
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJump(!awaiting && fromBottom > 240);
  }, [awaiting]);

  const prevLenRef = useRef(0);
  const roomKey = room?.id || room?.name;
  useEffect(() => { prevLenRef.current = 0; }, [roomKey]);
  useEffect(() => {
    const el = scrollRef.current;
    const len = messages?.length || 0;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (!el || !len) return;
    // The thread polls every 3s and hands back a fresh array each time. When the count didn't
    // change it's an identical re-render, not a new message — bail before any pin/scroll so the
    // view stays exactly where you left it (this is the guard the desktop screen already has;
    // without it a poll could re-snap your latest message to the top while you sat at the bottom).
    if (len === prev) return;
    // First load and every newly-sent active turn land at the tail. Once work settles,
    // preserve history reading unless the user was already following the bottom.
    if (prev === 0 || awaiting) { followTail(prev === 0 ? 'auto' : 'smooth'); return; }
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (fromBottom < 200) followTail('smooth');
  }, [messages, roomKey, awaiting, followTail]);

  // Step polling can change the live thread without adding a message. Follow those
  // real updates too, after React has laid out the newest step, so the singular
  // progress surface remains visibly anchored at the conversation tail.
  useEffect(() => {
    if (!awaiting) return undefined;
    const frame = requestAnimationFrame(() => followTail('auto'));
    return () => cancelAnimationFrame(frame);
  }, [awaiting, liveProgressKey, followTail]);

  const empty = status === 'empty' || !messages?.length;
  const [collection, setCollection] = useState(null); // { files, index } for the look-only viewer
  const openFile = useCallback((files, index) => setCollection({ files, index: index || 0 }), []);
  // Hand the actual files to the Review tool so it shows THESE files (live), not the
  // global queue. The file objects carry attachmentUrl/fileName/fileMime.
  // Accept an array of files, a single file object, or nothing. An earlier
  // caller wired `onClick={onReview}` and handed this a CLICK EVENT, which is
  // neither array nor a file with an address, so Review opened empty and
  // stranded on the projects panel (2026-07-18). normalizeReviewHandoff makes
  // the hand-off shape-proof (see reviewTargetResolve.js).
  const reviewHandoff = useCallback((files) => {
    setCollection(null);
    onOpenReview?.(normalizeReviewHandoff(files));
  }, [onOpenReview]);

  return (
    <div data-cv6 data-theme="dark" data-screen="chat-room" className="cv6-screen" style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--ground, #05080b)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="mhdr">
        {/* .mback removed 2026-08-07: swipe left returns Home, swipe right advances to next chat */}
        <div className={`mh-av is-${avRing(room.status)}`} style={avTint(room.status)}>
          {room.initials || '·'}
          <span className="mh-ring" />
          <span className="mh-dot" style={{ background: dotColor(room.status) }} />
        </div>
        <div className="mhtitle">
          <div className="mhname">
            <span className="mttl">{room.name}</span>
            {room.status && room.status !== 'ready' && (
              <span className={`astat is-${room.status}`}><span className="sd" />{String(room.status).toUpperCase()}</span>
            )}
          </div>
          <div className="msub">{room.statusText || 'conversation'}</div>
        </div>
        <div className="mhactions">
          <button type="button" className="cv6-chat-header-button" aria-label="Files" title="Files" data-testid="chat-files-button" onClick={() => { setMoreOpen(false); setWorkOpen(false); setFilesSheetOpen(true); }}>
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
          </button>
          {hasRoomWork ? (
            <button
              type="button"
              className="cv6-chat-header-button"
              aria-label="Activity"
              title="Activity"
              aria-expanded={workOpen ? 'true' : 'false'}
              onClick={() => { setMoreOpen(false); setWorkOpen((o) => !o); }}
              style={{ position: 'relative' }}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              <span aria-hidden="true" className="cv6-worklist-spin" style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--accent)', borderTopColor: 'transparent', display: 'block' }} />
            </button>
          ) : null}
          <button type="button" className="cv6-chat-header-button" aria-label="More" title="More" aria-expanded={moreOpen ? 'true' : 'false'} onClick={() => { setWorkOpen(false); setMoreOpen((open) => !open); }}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
          </button>
          {columnMode ? <ColumnExpandButton expanded={expanded} onToggle={onToggleWidth} label={room.name} /> : null}
          {columnMode ? (
            <button type="button" className="cv6-chat-header-button cv6-column-close" aria-label={`Close ${room.name}`} title={`Close ${room.name}`} onClick={onClose}>
              <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          ) : null}
          {moreOpen ? (
            <>
              <button type="button" className="cv6-chat-more-scrim" aria-label="Close More menu" onClick={() => setMoreOpen(false)} />
              <div className="cv6-chat-more-menu" role="menu" aria-label={`More for ${room.name}`}>
                <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); onSearch?.(); }}>Search conversation</button>
                <button type="button" role="menuitem" data-testid="room-settings-trigger" onClick={() => { setMoreOpen(false); setSettingsOpen(true); }}>Room settings</button>
                <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); setComposerCollapsed((c) => !c); }}>{composerCollapsed ? 'Show composer' : 'Hide composer'}</button>
              </div>
            </>
          ) : null}
          {workOpen ? (
            <>
              <button type="button" className="cv6-chat-more-scrim" aria-label="Close activity panel" onClick={() => setWorkOpen(false)} />
              <div className="cv6-work-dropdown" role="region" aria-label="Active work">
                <RoomWorkList room={fullRoom || room} goal={goal} awaiting={awaiting} awaitingSince={awaitingSince} liveSteps={liveSteps} currentAsk={currentAskTitle} expandable />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Bottom padding clears the absolutely-positioned composer (.mcomposer is
          position:absolute; bottom:0) plus the phone home indicator, so the last
          message can scroll fully into view instead of being cut off behind it. */}
      <div ref={scrollRef} onScroll={onScroll} className="scrbody" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Cap the thread to a readable column so on iPad it stays phone-width and centered,
            instead of stretching messages + cards edge to edge. */}
        <SendCtx.Provider value={onSend || (() => {})}>
        <ReviewCtx.Provider value={(file) => { if (file) reviewHandoff([file]); }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Fix 2: system alert messages (raw JSON, log filenames, tracebacks from the
              Systems agent) are pulled out of the thread and shown here as a collapsed
              status strip. Tap to expand. Never renders inline as a chat turn. */}
          <SystemAlertStrip alerts={systemAlerts} />
          {empty ? (
              <div className="empty" style={{ marginTop: 40 }}>
                <div className="e-t">No messages with {room.name} yet</div>
              <div className="e-s">{localReadOnly ? 'Connect a workspace to send messages.' : 'Start the conversation below.'}</div>
              </div>
          ) : (
            <>
              {/* No divider above folded days — the DayCard header already carries the same
                  date label; the pair read as a duplicate header (loop R16). */}
              {older.map((g, i) => (
                <DayCard key={g.key + i} group={g} onOpenFile={openFile} goal={threadGoal} onReview={reviewHandoff} onSend={onSend} />
              ))}
              {latest && (
                <>
                  <div className="daydiv"><span>{latest.label.toUpperCase()}</span></div>
                  <Cv6MessageThread
                    messages={latest.items}
                    goal={threadGoal}
                    room={{ name: room?.name, initials: room?.initials || '·' }}
                    variant="mobile"
                    mode="latest-day"
                    liveSteps={liveSteps}
                    awaiting={awaiting}
                    renderBlocks="goalBody"
                    renderAttachments="mobileGallery"
                    renderLiveWork="none"
                    allowBlocks
                    allowAttachments
                    allowLinkCards
                    allowChips={false}
                    onAction={onSend}
                    onOpenFile={openFile}
                    onReviewFiles={reviewHandoff}
                    MobileFileGallery={FileGallery}
                  />
                </>
              )}
            </>
          )}
          {/* One live surface at the conversation tail in every room state. It replaces
              the old accumulating WorkingTurn steps; bridge steps now animate through
              this fixed-height card and the same projection names the Activity dropdown. */}
          <RoomWorkList room={fullRoom || room} goal={goal} awaiting={awaiting} awaitingSince={awaitingSince} liveSteps={liveSteps} currentAsk={currentAskTitle} />
          {/* In-flight background work left the thread (corner:one-corner M19): it lives
              in the Background work window, reached from the drawer menu. */}
          {/* Only renders when the FRONT DOOR chose this room automatically. No projects /
              missions props here: this parent holds neither, so the bar fetches its own
              once it has something to show (corner:front-door R8). */}
          <RoutedHereBar room={fullRoom} worldId={worldId} />
          {/* A small tail marker only. Composer clearance comes from `.scrbody`; the former
              78vh pending spacer stranded live work above a blank page. */}
          <div style={{ height: 4 }} />
          <div ref={bottomRef} style={{ height: 4 }} />
        </div>
        </ReviewCtx.Provider>
        </SendCtx.Provider>
      </div>

      {showJump && (
        <button className="jumplive" onClick={jumpToLatest}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
          Jump to latest
        </button>
      )}

      {richComposer ? (
        <>
          {/* The rich composer (CV4 functionality, CV6 look: attach, command menu,
              slash commands, image gen, voice) portals into this host.
              cv6-mcomposer-host adds the collapse transition (opacity+translateY). */}
          <div className={`mcomposer cv6-mcomposer-host${composerCollapsed ? ' is-collapsed' : ''}`}
            ref={setMComposerHost}
            style={{ background: 'var(--chat-bar, rgba(5,8,11,.9))', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }} />
          <Cv6FullComposer target={mComposerHost} room={fullRoom} worldId={worldId} agents={[]}
            roomOptions={roomOptions} quickSend={onSendAndCollapse} onOpenFiles={() => setFilesSheetOpen(true)}
            onClearRoom={onClearRoom} />
        </>
      ) : (
      <div className={`mcomposer cv6-mcomposer-host${composerCollapsed ? ' is-collapsed' : ''}`}
        style={{ background: 'var(--chat-bar, rgba(5,8,11,.9))', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
        {dictate.supported && (
          <button onClick={dictate.toggle} aria-label={dictate.listening ? 'Stop dictation' : 'Speak your message'}
            title={dictate.listening ? 'Listening… tap to stop' : 'Speak your message'}
            style={{ width: 42, height: 42, borderRadius: 12, border: 'none', flex: 'none', cursor: 'pointer',
              background: dictate.listening ? '#e5484d' : 'var(--surface-2)', color: dictate.listening ? '#fff' : 'var(--faint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: dictate.listening ? '0 0 0 4px rgba(229,72,77,.18)' : 'none',
              transition: 'background .15s, box-shadow .15s, color .15s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </button>
        )}
        <input value={draft} disabled={localReadOnly} readOnly={localReadOnly} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder={localReadOnly ? 'Chat needs a connected workspace.' : (dictate.listening ? 'Listening…' : `Message ${room.name}…`)}
          style={{ flex: 1, height: 42, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '0 14px', fontSize: 14, color: localReadOnly ? 'var(--muted)' : 'var(--fg)', fontFamily: 'var(--font-sans)', outline: 'none', opacity: 1 }} />
        <button onClick={submit} disabled={localReadOnly} title={localReadOnly ? 'Local mode is read-only' : 'Send'} style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', opacity: localReadOnly ? .55 : 1 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
        </button>
      </div>
      )}
      {/* Mobile FAB — springs in when the composer collapses (cv6-chat-fab.is-visible). */}
      <button
        type="button"
        className={`cv6-chat-fab${composerCollapsed ? ' is-visible' : ''}`}
        onClick={() => {
          setComposerCollapsed(false);
          clearTimeout(composerCollapseTimerRef.current);
          // Focus after the CSS transition (220ms) so the keyboard opens immediately.
          setTimeout(() => {
            mComposerHost?.querySelector('input:not([type="file"]):not([type="hidden"]), textarea')?.focus();
          }, 60);
        }}
        aria-label="Open composer — type a message"
        title="Type a message"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {filesSheetOpen && (
        <RoomFilesSheet worldId={worldId} room={fullRoom}
          columnMode={columnMode}
          onClose={() => setFilesSheetOpen(false)}
          onReview={(it) => { setFilesSheetOpen(false); onOpenReview?.(it ? [it] : null); }} />
      )}

      {settingsOpen && fullRoom ? <RoomSettingsDialog
        room={fullRoom}
        worldId={worldId}
        projectId={projectId}
        onClose={() => setSettingsOpen(false)}
        onRenamed={onRoomRenamed}
        onOpenFiles={() => setFilesSheetOpen(true)}
        archivedMessages={archivedMessages}
        onClearRoom={onClearRoom}
      /> : null}

      {collection && <FileCollectionViewer files={collection.files} startIndex={collection.index} onClose={() => setCollection(null)} onReview={reviewHandoff} />}
    </div>
  );
}
